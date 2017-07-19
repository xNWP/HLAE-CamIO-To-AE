/*
    file: HLAE_CAMIO_2_AE Cam_v1.jsx
    author: Brett Anthony

    This script converts CamIO Data exported from Half-Life Advanced FX to an after effects camera.
    To get a point from CS:GO and map it to a point in after effects use the same mapping
    that BVH to AE by msthavoc uses. That is:

    X -> Z
    Y -> -X             Where X,Y,Z are obtained from getpos command in csgo.
    Z -> -Y

*/

function ImportCamFunc()
{
    // lot's of this code is based off msthavoc's code for the bvh importer.
    // ae js has poor to little documentation -_-


    // Check that we're selecting a comp
    var myComp = app.project.activeItem;
    if (myComp == null)
    {
        alert("Please select your comp to place the camera in.");
        return;
    }

    var CamIOFile = File.openDialog("Select CamIO File...", "*.*");
    CamIOFile.open("r", "CAMIO", "????");

    if (CamIOFile)
    {
        CamIOFile.open("r", "CAMIO", "????");

        var lineIn = CamIOFile.readln();

        var Header = lineIn;

        // HEADERS

        // catch non hlae camio file.
        if (Header != "advancedfx Cam")
        {
            alert("Not a valid HLAE CamIO File.");
            return;
        }

        lineIn = CamIOFile.readln();
        var version = lineIn.replace("version", "").replace(" ", "");
        // catch bad version
        version = parseInt(version);
        if (version > 1)
        {
            alert("HLAE CamIO version not supported by this script, check releases for a new version that does.");
            return;
        }

        lineIn = CamIOFile.readln();
        var ScaleFov = lineIn.replace("scaleFov", "").replace(" ", "");
        if (ScaleFov == "none")
        {
            ScaleFov = false;
            var RelatedRatio = (myComp.width/myComp.height)/(4.0/3.0);
        }
        else if (ScaleFov == "alienSwarm")
        {
            ScaleFov = true;
        }

        // skip non important data
        lineIn = CamIOFile.readln();
        lineIn = CamIOFile.readln();

        // Load in our data
        var camera = new Array();

        for (var i = 0; !CamIOFile.eof; i ++)
        {
            lineIn = CamIOFile.readln();
            camera[i] = lineIn.split(" ");
        }
        CamIOFile.close();

        // Load in data
        myComp.time = 0;

        myCamera = myComp.layers.addCamera("HLAE CamIO Camera", [0, 0]);
        myCamera.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
        myCamera.property("Position").setValue([0, 0, 0]);

        XZ = myComp.layers.addNull();
        XZ.threeDLayer = true;
        XZ.property("Position").setValue([0, 0, 0]);
        XZ.name = "HLAE CamIO XZ";

        Y = myComp.layers.addNull();
        Y.threeDLayer = true;
        Y.property("Position").setValue([0, 0, 0]);
        Y.name = "HLAE CamIO Y";

        myCamera.parent = XZ;
        XZ.parent = Y;

        var CamPos = new Array();
        var CamRotX = new Array();
        var CamRotY = new Array();
        var CamRotZ = new Array();
        var CamFov = new Array();
        var KeyTimes = new Array();

        var x, y, z, xr, yr, zr, fov;
        var fps = (1 / myComp.frameDuration);

        for (var i = 0; i < (camera.length - 1) && (i/fps) < (myComp.duration); i ++)
        {
            x = camera[i][1];
            y = camera[i][2];
            z = camera[i][3];
            xr = camera[i][4];
            yr = camera[i][5];
            zr = camera[i][6];
            fov = camera[i][7];

            if (!ScaleFov)
            {  
                fov = fov / 2;
                fov = DegToRad(fov);
                fov = Math.tan(fov);
                fov = RadToDeg(fov) * RelatedRatio;
                fov = Math.atan(DegToRad(fov));
                fov = RadToDeg(fov) * 2;
            }

            fov = myComp.width / (2 * Math.tan(DegToRad(fov / 2)));

            KeyTimes.push(i / fps);
            CamPos.push([-y, -z, x]);
            CamRotX.push(-yr);
            CamRotY.push(-zr);
            CamRotZ.push(xr);
            CamFov.push(fov);
        }

        cam_pos = Y.property("Position");
        cam_xrot = XZ.property("X Rotation");
        cam_yrot = Y.property("Y Rotation");
        cam_zrot = XZ.property("Z Rotation");
        cam_fov = myCamera.property("Zoom");

        // Progress Bar
        var PBWindow = new Window("palette");
        PBWindow.PBText = PBWindow.add("statictext", undefined, "Processing 0 of " + KeyTimes.length + " frames. (this may freeze ae)");
        PBWindow.PBText.preferredSize.width = 300;
        PBWindow.PBar = PBWindow.add("progressbar", undefined, 0, KeyTimes.length);
        PBWindow.PBar.preferredSize.width = 300;

        PBWindow.show();
        PBWindow.update();

        function UpdatePB(frame)
        {
            PBWindow.PBar.value = frame + 1;
            PBWindow.PBText.text = "Processing " + (frame + 1) + " of " + KeyTimes.length + " frames. (this may freeze ae)";

            PBWindow.update();
        }

        for (var i = 0; i < KeyTimes.length; i ++)
        {
            UpdatePB(i);

            cam_pos.setValueAtTime(KeyTimes[i], CamPos[i]);
            cam_xrot.setValueAtTime(KeyTimes[i], CamRotX[i]);
            cam_yrot.setValueAtTime(KeyTimes[i], CamRotY[i]);
            cam_zrot.setValueAtTime(KeyTimes[i], CamRotZ[i]);
            cam_fov.setValueAtTime(KeyTimes[i], CamFov[i]);

        }

        alert("Successfully imported camera with " + i + " frames.");

        PBWindow.close();
        UI.close();
    }

}

function DegToRad(degrees)
{
    return degrees * (Math.PI / 180);
}

function RadToDeg(radians)
{
    return radians * (180 / Math.PI);
}


function CreateUI(thisObj) {
    // Init UI
    var UI = (thisObj instanceof Panel) ? thisObj : new Window("palette", "HLAE CamIO2AE 1.0", [0, 0, 300, 180]);

    // Add Fields
    UI.add("statictext", [78, 15, 300, 40], "HLAE CamIO to AE Camera\r           version 1.0", { multiline: true });
    UI.add("statictext", [22, 35, 300, 100], "Select the comp to put the camera in, then import.");
    var importCam = UI.add("button", [70, 85, 230, 120], "Import HLAE CamIO");
    importCam.onClick = ImportCamFunc;


    UI.add("statictext", [105, 140, 230, 160], "script by xNWP");
    UI.add("statictext", [82, 155, 230, 173], "http://github.com/xNWP");

    // Don't really have a firm grasp on how AEES formats element location,
    // have an idea but not for sure, values were just thrown in until it looked good :-)

    return UI;
}

// MAIN PROGRAM EXECUTION
var UI = CreateUI(this);

UI.center();
UI.show();