# How to add Google Sheets as a DataSource for OptiSync

Article URL: https://support.optisigns.com/hc/en-us/articles/29838866920211-How-to-add-Google-Sheets-as-a-DataSource-for-OptiSync
Article ID: 29838866920211

#### Using our new OptiSync feature in Designer, you can add your Google Sheets to your DataSources and apply to your designs or our prebuilt Repeater Templates or Components. For a breakdown on OptiSync, please visit our guide **[here](https://support.optisigns.com/hc/en-us/articles/29217646663187)**. 

<table style="border-collapse: collapse; width: 64%;" border="1"><tbody><tr><td style="width: 100%;">Note: OptiSync is only available on Pro Plus and above plans.&nbsp;</td></tr></tbody></table>

## Adding Your Google Sheets as a DataSource

There are two different methods to adding Google Sheets to your DataSources:

#### **Method 1: Through Designer**

*   On the Files/Assets page, select **Designer** from the Apps
*   Select **DataSource** on the side menu, then **Add DataSource**
*   Click **Google Sheets**
*   Copy and Paste your Google Sheets URL into the provided text box, then **Import Data**
    *   Note: You will be prompted to sign into your Google
*   Once your Google Sheets is imported into a table in our portal, click **Save**
*   **Name** your DataSource something easily recognizable
*   Select your Synchronization and Update Interval
*   Click **Done**

**Method 2: Through Account Settings**

*   In our portal, select your account name, then **More**, then **DataSources**
*   Select **Google Sheets** from the list of options
*   Copy and Paste your Google Sheets URL into the provided text box, then **Import Data**
    *   Note: You will be prompted to sign into your Google
*   Once your Google Sheets is imported into a table in our portal, click **Update**
*   **Name** your DataSource something easily recognizable
*   Select your Synchronization and Update Interval
*   Click **Done**
*   Your **DataSource** will now be listed within your Advanced Account Settings

**Synchronization**

*   **Only import once:** This option imports the data only once when you add the DataSource. After the initial import, the data will not be updated automatically.
*   **Periodic direct access:** This option regularly fetches the latest data directly from the device through your gateway, providing "live access" to the data and ensuring you have the most up-to-date information available directly from the device.
    *   _This is better for more consistent update intervals, but could cause performance issues._ 
*   **Periodic background sync:** This option periodically syncs data to your server in the background at regular intervals, reducing the need for direct queries to the device.

<table style="border-collapse: collapse; width: 100%; height: 44px;" border="1"><tbody><tr style="height: 22px;"><td class="wysiwyg-text-align-center" style="width: 100%; height: 22px;"><strong>IMPORTANT</strong></td></tr><tr style="height: 22px;"><td style="width: 100%; height: 22px;">OptiSync does not support special characters (i.e. anything outside the scope of an English-language keyboard). This will cause the system data to read as blank, and it will not show.</td></tr></tbody></table>

**Update Interval**

_The duration of time between updates if you chose "Periodic direct access" or "Periodic background sync"_

*   None _(Your Datasource will import with the newest data available, but will not continuously update afterward. You will have to force refresh data for new updates.)_ 
*   30 minutes
*   1 hour
*   8 hours

<table style="border-collapse: collapse; width: 64.2857%;" border="1"><tbody><tr><td style="width: 100%;"><h4 id="h_01HZ57NKKH32JF2ZPHCK9BY3P4">If you'd like to learn more about OptiSync and how to use this DataSource for Data Mapping, please visit the following guide:</h4></td></tr><tr><td style="width: 100%;"><strong><a href="https://support.optisigns.com/hc/en-us/articles/29217646663187" target="_blank" rel="noopener noreferrer">How to Set Up Dynamic Data Mapping with OptiSync</a></strong></td></tr></tbody></table>

## That's it!

Now you've successfully added your Excel spreadsheet as a DataSource to be used for data mapping with OptiSync!
