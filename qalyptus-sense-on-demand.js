define([
    "jquery",
    "qlik",
    "./js/properties",
    "text!./css/qalyptus-sense-on-demand.css",
    "text!./css/bootstrap.css",
    "text!./template/view-main-single.html",
    "text!./template/view-popup.html",
    //"client.models/current-selections",
    "qvangular",
    "core.utils/deferred",
    //"objects.backend-/api/listbox-api",
    //"objects.models/listbox",
    "./js/button",
    "./js/dropdown"
],
    function (
        $,
        qlik,
        properties,
        css,
        bootstrap,
        viewMain,
        viewPopup,
        //CurrentSelectionsModel,
        qvangular,
        Deferred
        //ListboxApi,
        //Listbox
    ) {
        $("<style>").html(css).appendTo("head");
        $("<style>").html(bootstrap).appendTo("head");
        $(".qui-buttonset-right").prepend($("<button class='lui-button lui-button--toolbar iconToTheRight npsod-bar-btn'><span data-icon='toolbar-print'>Qalyptus Reports</span></button>"));

        var app = qlik.currApp();
        var currentSelections;



        function getLoginNtlm(conn) {
            var URL = conn.server + '/api/v1/login/ntlm'
            return $.ajax({
                url: URL,
                method: 'GET',
                xhrFields: {
                    withCredentials: false
                }
            });
        }

        function refreshToken(conn, refreshToken) {
            return $.ajax({
                url: conn.server + '/api/v1/login/refresh?refreshToken=' + refreshToken,
                method: 'GET'
            }).then(function (response) {
                localStorage.setItem("token", response.data.token)
                localStorage.setItem("refreshToken", response.data.refreshToken);
            });
        }



        var Progress = function (element) {
            var progress = 0;
            var bar = element;

            this.getProgress = function () {
                return progress;
            };

            this.setProgress = function (value) {
                progress = value;
                bar.css("width", progress + "%");
                bar.find("span").text(progress + '% Complete');
            };
            this.addProgress = function (increment) {
                if (progress + increment < 100) {
                    this.setProgress(progress + increment);
                }
            };
        }

        function checkProgress(URL, /*progress,*/ callback) {
            $.ajax({
                url: URL,
                method: 'GET',
                xhrFields: {
                    withCredentials: false
                }
            }).then(function (response) {
                switch (response.data.status) {
                    case 'aborted':
                    case 'failed':
                        alert('Error');
                        break;
                    case 'queued':
                    case 'running':
                        //progress.addProgress(10);
                        setTimeout(function () {
                            checkProgress(URL, progress, callback);
                        }, 1000);

                        break;

                    default:
                        //progress.setProgress(100);
                        callback();
                }
            });

        }

        function getSelectionByApi() {
            var fp = [];
            if (currentSelections === undefined) {
                return Promise.resolve([]);
            }
            currentSelections.map(function (selection) {
                fp.push(getSelectedValues(selection));
            });
            return Deferred.all(fp);
        }

        function getSelectedValues(selection) {
            var df = Deferred(),
                f = app.field(selection.fieldName).getData(),
                listener = function () {
                    var isNumeric = false,
                        selectedValues = f.rows.reduce(function (result, row) {
                            if (row.qState === 'S' || row.qState === 'L') {
                                if (!isNumeric && !isNaN(row.qNum)) {
                                    isNumeric = true;
                                }
                                result.push(isNumeric ? row.qNum : row.qText);
                            }
                            return result;
                        }, []);
                    df.resolve({
                        fieldName: selection.fieldName,
                        selectedCount: selection.selectedCount,
                        selectedValues: selectedValues,
                        isNumeric: isNumeric
                    });

                    f.OnData.unbind(listener);
                };

            f.OnData.bind(listener);

            return df.promise;
        }

        function getSelectionByQlik() {
            globalSelectionService = qvangular.getService('qvGlobalSelectionsService');

            return CurrentSelectionsModel.get().then(function (model) {
                return model.getLayout().then(function (layout) {
                    return getSelectedValuesByInternalService(layout, app.model.enigmaModel);
                });
            });
        }

        function getSelectedValuesByQlik(layout, enigmaModel) {
            var i, qSelections = layout.qSelectionObject ? layout.qSelectionObject.qSelections : null;
            var fieldPromises = [];

            if (qSelections && qSelections.length > 0) {

                var fieldExtractor = function (qFieldSelections, rects) {
                    var rects = [{
                        qTop: 0,
                        qLeft: 0,
                        qWidth: 1,
                        qHeight: qFieldSelections.selectedCount
                    }];

                    var fp = Listbox.createTransientField(enigmaModel, qFieldSelections.fieldName, {}).then(function (model) {
                        var backendApi = new ListboxApi(model);
                        return backendApi.getData(rects).then(function (dataPages) {
                            if (dataPages && dataPages.length) {
                                var valArr = dataPages[0].qMatrix;
                                var v;
                                for (var j = 0; j < valArr.length; j++) {
                                    v = valArr[j][0];
                                    var isNum = !isNaN(v.qNum);
                                    qFieldSelections.selectedValues.push(isNum ? v.qNum : v.qText);
                                    // set isNumeric if there is a number
                                    qFieldSelections.isNumeric = qFieldSelections.isNumeric || isNum;
                                }
                            }
                            return qFieldSelections;
                        });
                    });
                    return fp;
                };

                for (i = 0; i < qSelections.length; i++) {
                    var fieldSelections = {
                        fieldName: qSelections[i].qField,
                        selectedCount: qSelections[i].qSelectedCount,
                        selectedValues: [],
                        isNumeric: false
                    }
                    fieldPromises.push(fieldExtractor(fieldSelections));
                }
            }
            return Deferred.all(fieldPromises);
        }

        function doExport(options) {
            var conn = options.conn,
                report = options.report,
                format = options.format,
                useCredentials = options.withCredentials

            selections = getSelectionByApi();
            //selections = getSelectionByQlik();

            return selections.then(function (allFieldSelections) {
                return getConnections(conn).then(function (response) {
                    var connectionId;
                    if (response.data.totalItems == 1) {
                        connectionId = response.data[0].id;
                    } else {
                        for (var i = 0; i < response.data.length; i++) {
                            var projectId = response.data[i].projectId;
                            if (projectId == conn.app) {
                                connectionId = response.data[i].id;
                                break;
                            }
                        }
                    }
                    var requestUrl = conn.server + '/api/v1/ondemand/requests';
                    var onDemandRequest = {
                        type: 'report',
                        config: {
                            reportId: report,
                            outputFormat: format
                        },
                        selections: allFieldSelections,
                        // here's the sense connection on which we want to apply selections
                        connectionId: connectionId//'5c0af3f6-e65d-40d2-8f03-6025f8196ff'
                    };
                    return $.ajax({
                        url: requestUrl,
                        method: 'POST',
                        contentType: 'application/json',
                        crossDomain: true,
                        data: JSON.stringify(onDemandRequest),
                        xhrFields: {
                            withCredentials: useCredentials
                        },
                        beforeSend: function (xhr) {
                            if (useCredentials == false) {
                                xhr.setRequestHeader("Content-Type", "application/json");
                                xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
                            }
                        },
                        statusCode: {
                            417: function (xhr) {
                                refreshToken(conn, localStorage.getItem("refreshToken"));
                            },
                            401: function (xhr) {
                                alert(xhr.statusText)
                            }
                        }
                    });
                });
            });
        }

        function getReportList(conn) {
            var requestUrl = conn.server + '/api/v1/reports' + '?projectId=' + conn.app;
            return $.ajax({
                url: requestUrl,
                method: 'GET',
                xhrFields: {
                    withCredentials: conn.auth == 'ntlm'
                },
                beforeSend: function (xhr) {
                    if (conn.auth != 'ntlm') {
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
                    }
                },
                statusCode: {
                    417: function (xhr) {
                        refreshToken(conn, localStorage.getItem("refreshToken"));
                    },
                    401: function (xhr) {
                        alert(xhr.statusText)
                    }
                }
            });
        }

        function getExportFormats(conn, report) {
            var requestUrl = conn.server + '/api/v1/reports' + '/' + report.id;
            return $.ajax({
                url: requestUrl,
                method: 'GET',
                xhrFields: {
                    withCredentials: conn.auth == 'ntlm'
                },
                beforeSend: function (xhr) {
                    if (conn.auth != 'ntlm') {
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
                    }
                },
                statusCode: {
                    417: function (xhr) {
                        refreshToken(conn, localStorage.getItem("refreshToken"));
                    },
                    401: function (xhr) {
                        alert(xhr.statusText)
                    }
                }
            })
        }

        function getTasks(conn) {
            var requestUrl = conn.server + '/api/v1/ondemand/requests' + '?projectId=' + conn.app;
            return $.ajax({
                url: requestUrl,
                method: 'GET',
                xhrFields: {
                    withCredentials: conn.auth == 'ntlm'
                },
                beforeSend: function (xhr) {
                    if (conn.auth != 'ntlm') {
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
                    }
                },
                statusCode: {
                    417: function (xhr) {
                        refreshToken(conn, localStorage.getItem("refreshToken"));
                    },
                    401: function (xhr) {
                        alert(xhr.statusText)
                    }
                }
            });
        }

        function getConnections(conn) {
            var requestUrl = conn.server + '/api/v1/connections?projectId=' + conn.app;
            return $.ajax({
                url: requestUrl,
                method: 'GET',
                xhrFields: {
                    withCredentials: conn.auth == 'ntlm'
                },
                beforeSend: function (xhr) {
                    if (conn.auth != 'ntlm') {
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
                    }
                },
                statusCode: {
                    417: function (xhr) {
                        refreshToken(conn, localStorage.getItem("refreshToken"));
                    },
                    401: function (xhr) {
                        alert(xhr.statusText)
                    }
                }
            });
        }

        function deleteTask(conn, taskId) {
            var requestUrl = conn.server + '/api/v1/ondemand/requests/' + taskId;
            $.support.cors = true;
            return $.ajax({
                url: requestUrl,
                headers: {
                    'access-control-allow-headers': 'content-type'
                },
                method: 'DELETE',
                xhrFields: {
                    withCredentials: conn.auth == 'ntlm'
                },
                beforeSend: function (xhr) {
                    if (conn.auth != 'ntlm') {
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
                    }
                },
                statusCode: {
                    417: function (xhr) {
                        refreshToken(conn, localStorage.getItem("refreshToken"));
                    },
                    401: function (xhr) {
                        alert(xhr.statusText)
                    }
                }
            });
        }

        function downloadTask(conn, taskId, title) {
            var requestUrl = conn.server + '/api/v1/ondemand/requests/' + taskId + '/result';

            var xhr = new XMLHttpRequest();
            xhr.open("GET", requestUrl, true);
            xhr.responseType = "blob";
            if (conn.auth == 'ntlm') {
                xhr.withCredentials = true;
            }
            else {
                xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
            }
            xhr.onload = function (oEvent) {
                var blob = xhr.response;
                saveBolb(blob, title);
            };

            xhr.send();
        }

        var saveBolb = (function () {
            var a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";
            return function (blob, fileName) {
                url = window.URL.createObjectURL(blob);
                a.href = url;
                a.download = fileName;
                a.click();
                window.URL.revokeObjectURL(url);
            };
        }());

        function getImg(type) {
            switch (type) {
                //Tempate formats
                case 'Excel':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-template-excel.png';
                case 'PowerPoint':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-template-ppt.png';
                case 'Html':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-template-html.png';
                case 'Word':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-template-word.png';
                case 'QlikEntity':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-template-qlik.png';

                //Export formats
                case 'Pdf':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-pdf.png';
                case 'Html':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-html.png';
                case 'Doc':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-doc.png';
                case 'Ppt':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-ppt.png';

                case 'Xls':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-xls.png';

                case 'Docx':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-docx.png';

                case 'Pptx':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-pptx.png';

                case 'Xlsx':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-xlsx.png';

                case 'Csv':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-csv.png';

                case 'Jpeg':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-jpeg.png';

                case 'Png':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-png.png';

                case 'Tiff':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-tiff.png';
                case 'Bmp':
                    return '../extensions/qalyptus-sense-on-demand/images/icon-file-bmp.png';

                case 'LOADING':
                    return '../extensions/qalyptus-sense-on-demand/images/loading-gear.gif';
                default:
                    return '../extensions/qalyptus-sense-on-demand/images/icon-template-pp.png';
            }
        }

        return {
            support: {
                snapshot: false,
                export: false,
                exportData: false
            },

            definition: {
                type: "items",
                label: "Qalyptus On Demand",
                component: "accordion",
                items: {
                    Authentication: Authentication,
                    ReportSection: ReportSection,
                    Appearance: AppearanceSection,

                    addons: {
                        uses: "addons",
                        items: {
                            dataHandling: {
                                uses: "dataHandling"
                            }
                        }
                    }
                }
            },

            template: viewMain,

            controller: ['$scope', '$element', '$compile', '$interval', function ($scope, $element, $compile, $interval) {
                //$scope.label = "Export";
                $scope.downloadable = false;
                var conn = $scope.layout.npsod.conn;
                var currReport = null;
                var buttonPosition = ($scope.layout.npsod.button && $scope.layout.npsod.button.position) ? $scope.layout.npsod.button.position : 'top';
                $scope.buttonStyle = { 'vertical-align': buttonPosition };

                $scope.objId = Math.floor(Math.random() * 1000000);
                var x = document.createElement("var");
                x.id = $scope.objId;
                document.body.appendChild(x);

                var vars = document.getElementsByTagName('var');
                /* if(vars[0].id==$scope.objId){
                     getLoginNtlm(conn);
                 }*/

                $('.npsod-bar-btn').on('click', function () {
                    $scope.popupDg();
                });


                $scope.doExport = function () {
                    var options = {
                        conn: conn,
                        report: conn.report,
                        format: conn.exportFormat,
                        withCredentials: conn.auth == 'ntlm'
                    };

                    var url = window.location.href;
                    if (!url.endsWith('edit')) {
                        doExport(options).then(function (response) {
                            $scope.popupDg();
                        });
                    }
                };

                $scope.popupDg = function () {
                    //exportReport(format, currReport);
                    if ($('.npsod-popup').length == 0) {
                        var viewPopupDg = $compile(viewPopup);
                        $("body").append(viewPopupDg($scope));

                        var modal = $(".npsod-popup");
                        modal.find("button.cancel-button").on('qv-activate', function () {
                            modal.remove();
                            if (angular.isDefined(pullTaskHandler)) {
                                $interval.cancel(pullTaskHandler);
                                pullTaskHandler = undefined;
                            }
                        });

                        var pullTaskHandler = $interval(function () {
                            getTasks(conn).then(function (response) {
                                $scope.taskList = response.data;
                                $scope.$apply();
                            });
                        }, 1000);

                        $scope.go2OverviewStage(conn);

                    }
                };

                $scope.getImg = getImg;

                $scope.go2OverviewStage = function () {
                    $scope.stage = 'overview';
                };

                $scope.go2SelectReportStage = function () {
                    getReportList(conn).then(function (response) {
                        $scope.reportList = response.data;
                        $scope.stage = 'selectReport';
                        $scope.$apply();
                    });
                };

                $scope.go2selectFormatStage = function (report) {
                    getExportFormats(conn, report).then(function (response) {
                        $scope.currReport = report;
                        $scope.outputFormats = response.data.outputFormats;

                        $scope.stage = 'selectFormat';

                        $scope.$apply();
                    });
                };

                $scope.exportReport = function (format) {
                    var options = {
                        conn: conn,
                        report: $scope.currReport.id,
                        format: format,
                        withCredentials: conn.auth == 'ntlm'
                    };

                    doExport(options).then(function () {
                        $scope.go2OverviewStage();
                    });
                };

                $scope.deleteTask = function (taskId) {
                    deleteTask(conn, taskId).then(function () {
                        $scope.go2OverviewStage(conn);
                    });
                };

                $scope.downloadTask = function (taskId, title) {
                    downloadTask(conn, taskId, title);
                };

                //Selection Listener
                // create an object
                var selState = app.selectionState();
                var listener = function () {
                    currentSelections = selState.selections;
                };
                //bind the listener
                selState.OnData.bind(listener);


                // Hacking the layout

                var innerObj = $($element).parents(".qv-inner-object");
                var outterObj = $($element).parents(".qv-object");

                innerObj.css('background', 'transparent');
                outterObj.css('border', 'none');
                outterObj.find('.lui-icon--expand ').remove();
            }],
            paint: function ($element, layout) {
                let $scope = this.$scope;
                var buttonPosition = (layout.npsod.button && layout.npsod.button.position) ? layout.npsod.button.position : 'top';
                $scope.buttonStyle = { 'vertical-align': buttonPosition };
                $scope.DomId = layout.npsod.button.DomId;
                $scope.CSSConditionalClass = (layout.npsod.button.CSSConditionalClass || layout.npsod.button.CSSConditionalClass.length > 0) ? layout.npsod.button.CSSConditionalClass : '';


            },
        };

    });