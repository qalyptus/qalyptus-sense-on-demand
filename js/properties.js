
var Authentication = {
	type: "items",
	label: "Authentication",
	items: {
		buttonLogin: {
			type: "string",
			component: "buttongroup",
			label: "Type",
			ref: "npsod.conn.auth",
			options: [{
				value: "jwt",
				label: "Qalyptus",
				tooltip: "Authenticate with Qalyptus credentials"
			}
				, {
				value: "ntlm",
				label: "Windows",
				tooltip: "Authenticate with your Windows credentials"
			}
			],
			defaultValue: "jwt"
		},
		server: {
			ref: "npsod.conn.server",
			label: "Server Connection",
			type: "string",
			expression: "optional"
		},
		username: {
			ref: "npsod.conn.username",
			label: "Username",
			type: "string",
			defaultValue: "",
			show: function (e) { return e.npsod.conn.auth === 'jwt' }
		},
		Password: {
			ref: "npsod.conn.password",
			label: "Password",
			type: "string",
			defaultValue: "",
			show: function (e) { return e.npsod.conn.auth === 'jwt' }
		},
		Login: {
			ref: "npsod.conn.login",
			label: "Log In",
			component: "button",
			show: function (e) { return e.npsod.conn.auth === 'jwt' },
			action: function (data) {
				return $.ajax({
					url: data.npsod.conn.server + '/api/v1/login',
					method: 'POST',
					contentType: 'application/json',
					data: JSON.stringify({ username: data.npsod.conn.username, password: data.npsod.conn.password }),
					xhrFields: {
						withCredentials: data.npsod.conn.auth === 'ntlm'
					}
				}).then(function (res) {
					localStorage.setItem("token", res.data.token);
					localStorage.setItem("refreshToken", res.data.refreshToken);
					data.npsod.conn.password = '';
					alert(res.status.message);
				}).catch(function (err) {
					alert(err.statusText);
				});
			}
		}
	}
};

var ReportSection = {
	type: "items",
	label: "Report Configuration",
	items: {
		app: {
			type: "string",
			component: "dropdown",
			label: "Choose Project",
			ref: "npsod.conn.app",
			options: function (data) {
				return $.ajax({
					url: data.npsod.conn.server + '/api/v1/projects',
					method: 'GET',
					xhrFields: {
						withCredentials: data.npsod.conn.auth === 'ntlm'
					},
					beforeSend: function (xhr) {
						xhr.setRequestHeader("Content-Type", "application/json");
						xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
					},
					beforeSend: function (xhr) {
						xhr.setRequestHeader("Authorization", "Bearer" + " " + localStorage.getItem("token"));
					},
					statusCode: {
						401: function (xhr) {
							alert(xhr.statusText)
						}
					}
				}).then(function (response) {
					return response.data.map(function (report) {
						return {
							value: report.id,
							label: report.name
						}
					});
				});
			}
		},
		report: {
			type: "string",
			component: "dropdown",
			label: "Choose Report",
			ref: "npsod.conn.report",
			options: function (data) {
				var requestUrl = data.npsod.conn.server + '/api/v1/reports' + '?projectId=' + data.npsod.conn.app;
				return $.ajax({
					url: requestUrl,
					method: 'GET',
					xhrFields: {
						withCredentials: data.npsod.conn.auth === 'ntlm'
					},
					beforeSend: function (xhr) {
						xhr.setRequestHeader("Authorization", "Bearer" + " " + localStorage.getItem("token"));
					},
					statusCode: {
						401: function (xhr) {
							alert(xhr.statusText)
						}
					}
				}).then(function (response) {
					return response.data.map(function (report) {
						return {
							value: report.id,
							label: report.name
						}
					});
				});
			}
		},
		exportFormat: {
			type: "string",
			component: "dropdown",
			label: "Default Export Format",
			ref: "npsod.conn.exportFormat",
			options: function (data) {
				var requestUrl = data.npsod.conn.server + '/api/v1/reports' + '/' + data.npsod.conn.report;

				return $.ajax({
					url: requestUrl,
					method: 'GET',
					xhrFields: {
						withCredentials: false
					},
					beforeSend: function (xhr) {
						xhr.setRequestHeader("Authorization", "Bearer" + " " + localStorage.getItem("token"));
					},
					statusCode: {
						401: function (xhr) {
							alert(xhr.statusText)
						}
					}
				}).then(function (response) {
					return response.data.outputFormats.map(function (format) {
						return {
							value: format,
							label: format.toUpperCase()
						}
					});
				});
			}
		},
		buttonRefresh: {
			type: "boolean",
			component: "switch",
			label: "Refresh",
			ref: "npsod.button.refresh",
			options: [
				{
					value: true,
					label: "",
				},
				{
					value: false,
					label: "",
				},
			],
			defaultValue: true
		}
	}
};

var AppearanceSection = {
	uses: "settings",
	items: {
		label: {
			ref: "npsod.conn.label",
			label: "Button Label",
			type: "string",
			expression: "optional"
		},
		presentation: {
			label: "Display",
			items: {
				buttonPosition: {
					type: "string",
					component: "buttongroup",
					label: "Button position",
					ref: "npsod.button.position",
					options: [
						{
							value: "top",
							label: "Top",
							tooltip: "Top"
						},
						{
							value: "middle",
							label: "Middle",
							tooltip: "Middle"
						},
						{
							value: "bottom",
							label: "Bottom",
							tooltip: "Bottom"
						}
					],
					defaultValue: "top"
				},
				DomId: {
					type: "string",
					label: "DOM Id",
					ref: "npsod.button.DomId",
					expression: "optional",
					default: "[]"
				},
				CSSConditionalClass: {
					type: "string",
					label: "CSS Conditional Class",
					ref: "npsod.button.CSSConditionalClass",
					expression: "always",
					defaultValue: ""
				}

			}
		},
	}
};