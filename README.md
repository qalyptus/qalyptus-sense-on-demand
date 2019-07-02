# The extension is back again with June 2018 Release. 
With the latest update for this extension. The on-demand selection code has been adapted to Capability APIs, not relying on Qlik internal moduels any more.

Please feel free to download the latest project and import into QMC. It will automatically work with any Qlik versions.

It also resolves the problem with Qlik modules loading failure in mashups by the way. 

# qalyptus-sense-on-demand
Qalyptus On-demand extension for Qlik Sense

## Get Started:

1.Drag in extension onto your sheet.

2.Choose authentication type. You can use Windows credentials or Qalyptus credentials.

3.Configure Qalyptus Server host name, such as http://qalyptus.test.local:3994

### Windows credentials
![alt tag](https://github.com/qalyptus/qalyptus-sense-on-demand/blob/master/tutorial/1-1.png)

###  Qalyptus credentials
![alt tag](https://github.com/qalyptus/qalyptus-sense-on-demand/blob/master/tutorial/1-1-2.png)

4.Pick your report in "Report Configuration" Section and choose a project from the following dropbox

5.Choose a report

6.And choose your expected export format

![alt tag](https://github.com/qalyptus/qalyptus-sense-on-demand/blob/master/tutorial/1-2.png)

7.Go to Analysis Mode and Press the button to start report generation

![alt tag](https://github.com/qalyptus/qalyptus-sense-on-demand/blob/master/tutorial/1-3.png)

8.Popup window will show up and auto pulling the status of the generation.

![alt tag](https://github.com/qalyptus/qalyptus-sense-on-demand/blob/master/tutorial/1-4.png)

9.When reported is generated on Qalyptus server, the download button will appear. Click the button to download your report.

![alt tag](https://github.com/qalyptus/qalyptus-sense-on-demand/blob/master/tutorial/1-5.png)

## Self-Service Report

1.A "Qalyptus Reports" button is appended in the top when this extension is used. 

![alt tag](https://github.com/qalyptus/qalyptus-sense-on-demand/blob/master/tutorial/2-1.png)

2.A "New Report" button is displayed at the bottom. That's for self-service report generation.

![alt tag](https://github.com/qalyptus/qalyptus-sense-on-demand/blob/master/tutorial/2-2.png)

3.Press the button and all 'On-Demand' reports (that current user is allowed to see) will be listed.

![alt tag](https://github.com/qalyptus/qalyptus-sense-on-demand/blob/master/tutorial/2-3.png)

4.Then choose your desired report format

![alt tag](https://github.com/qalyptus/qalyptus-sense-on-demand/blob/master/tutorial/2-4.png)

5.Then it will come back to the Export overview and wait for the report to be accomplished.

![alt tag](https://github.com/qalyptus/qalyptus-sense-on-demand/blob/master/tutorial/2-5.png)

## Limitations
1.(Due to techical reasons) The self-service button will not show up until you get into a sheet contains this extension. And it will always stay there until you refresh your page. And it's not working when you navigate to other sheets that don't contain this extension. This will be fixed in following release

2.There should be a button in prop panel to control enabling or disabling the "Self-service" icon-button. Will be fixed in following releases

## Roadmap

0.Welcome for any suggestions

1.Add a button in prop panel to enable/disable the 'Self-service' button

2.Add "test connection" to give better response in prop panel to reflect the connection status and error messages if failed.

3.Find a way to make the 'self-service' button working outside sheets that don't contain this extension

4.Add permission control according to QRS user properties/security rules

5.Add more settings in prop panel for customizing appearance

## Contact

For any questions and support, please feel free to contact:

Qalyptus support (support@qalyptus.com)

## Info
This extension is forked from bohua/nprinting-sense-on-demand 
