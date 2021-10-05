/*
    file: HLAE_CAMIO_2_AE Cam.jsx
    version: 2
    author: Brett Anthony

    This script converts CamIO Data exported from Half-Life Advanced FX to an after effects camera.
    To get a point from CS:GO and map it to a point in after effects use the same mapping
    that BVH to AE by msthavoc uses. That is:

    X -> Z
    Y -> -X             Where X,Y,Z are obtained from getpos command in csgo.
    Z -> -Y

*/

var HLAECamIO2AE_VersionMajor = 2;
var HLAECamIO2AE_VersionMinor = 0;
var HLAECamIO2AE_Version =
(HLAECamIO2AE_VersionMajor + '.' + HLAECamIO2AE_VersionMinor);
var HLAECamIO2AE_MaxCamIOVersion = 2;

/* Main Script */
function ImportCamFunc()
{
    // Check that we're selecting a comp
    var myComp = app.project.activeItem;
    if (myComp == null)
    {
        alert("Please select a comp to place the camera in.");
        return;
    }

    var CamIOFile = File.openDialog("Select CamIO File...", "*.*");
    CamIOFile.open("r", "CAMIO", "????");

    if (CamIOFile)
    {
        var lineIn = CamIOFile.readln();
        var Header = lineIn;

        // default values
        var ScaleFov = true;
        var FileVersion = -1;
        var RelatedRatio = 0.0;

        // catch non hlae camio file.
        if (Header != "advancedfx Cam")
        {
            alert("Not a valid HLAE CamIO File.");
            return;
        }

        lineIn = CamIOFile.readln();
        while (lineIn != "DATA")
        {
            lineSplit = lineIn.split(' ');
            lineIn = CamIOFile.readln();
            if (lineSplit.length == 0)
                continue;

            // version
            if (lineSplit[0] == "version")
            {
                FileVersion = parseInt(lineSplit[1]);
                if (FileVersion > HLAECamIO2AE_MaxCamIOVersion)
                {
                    if (!confirm("CamIO file is version " + FileVersion
                    + ", this script is designed for version " + HLAECamIO2AE_MaxCamIOVersion
                    + " and lower. Try importing the file anyway?"))
                        return;
                }
                continue;
            }

            // scale
            if (lineSplit[0] == "scaleFov")
            {
                if (lineSplit[1] == "none")
                {
                    ScaleFov = false;
                    RelatedRatio = (myComp.width/myComp.height)/(4.0/3.0);
                }
                continue;
            }
        }

        // catch no version
        if (FileVersion < 0)
        {
            alert("Invalid CamIO file.");
            return;
        }

        // Load in our data
        var camera = new Array();

        for (var i = 0; !CamIOFile.eof; i++)
        {
            lineIn = CamIOFile.readln();
            camera[i] = lineIn.split(" ");
        }
        CamIOFile.close();

        app.beginUndoGroup("HLAE CamIO Import");
        // Load in data
        myComp.time = 0;

        myCamera = myComp.layers.addCamera("HLAE CamIO Camera", [0, 0]);
        myCamera.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
        myCamera.property("Position").setValue([0, 0, 0]);
        
        var CamPos = new Array();
        var CamRot = new Array();
        var CamFov = new Array();
        var KeyTimes = new Array();
        const fps = (1 / myComp.frameDuration);

        for (var i = 0; i < (camera.length) && (i/fps) < (myComp.duration); i++)
        {
            var x = camera[i][1];
            var y = camera[i][2];
            var z = camera[i][3];
            var xr = DegToRad(camera[i][4]); // roll
            var yr = DegToRad(camera[i][5]); // pitch
            var zr = DegToRad(camera[i][6]); // heading

            // Create a rotation matrix in HPB intrinsic (csgo) order,
            var RotMat = RotMatX(xr);
            RotMat = Mmul(RotMatY(yr), RotMat);
            RotMat = Mmul(RotMatZ(zr), RotMat);

            /*
            Decompose it in PHB intrinsic (ae) order.
            We don't need to worry about taking the shortest route here,
            we'll be placing the rotation values in the orientation field
            which AE uses quaternions for internally.
            */
            yr = Math.atan2(-RotMat[2][0], RotMat[0][0]);
            yr = RadToDeg(yr);
            xr = Math.atan2(-RotMat[1][2], RotMat[1][1]);
            xr = RadToDeg(xr);
            var r31 = RotMat[2][0];
            var r11 = RotMat[0][0];
            zr = Math.atan2(RotMat[1][0], Math.sqrt(r31*r31 + r11*r11));
            zr = RadToDeg(zr);

            var fov = camera[i][7];

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
            CamRot.push([-yr, -zr, xr]);
            CamFov.push(fov);
        }

        myCamera.transform.position.setValuesAtTimes(KeyTimes, CamPos);
        myCamera.transform.orientation.setValuesAtTimes(KeyTimes, CamRot);
        myCamera.cameraOption.zoom.setValuesAtTimes(KeyTimes, CamFov);

        alert("Successfully imported camera with " + KeyTimes.length + " frames.");

        app.endUndoGroup();
        UI.close();
    }
    else
    {
        alert("Could not open CamIO file.");
    }

}

function CreateUI(thisObj) {
    // Init UI
    var UI = (thisObj instanceof Panel) ? thisObj :
    new Window("palette",
    "HLAE CamIO2AE " + HLAECamIO2AE_Version,
    [0, 0, 300, 180]);

    // Add Fields
    UI.add("statictext", [78, 15, 300, 40], "HLAE CamIO to AE Camera");
    UI.add("statictext", [112, 28, 300, 50], "version " + HLAECamIO2AE_Version);
    UI.add("statictext", [22, 35, 300, 100], "Select the comp to put the camera in, then import.");
    var importCam = UI.add("button", [70, 85, 230, 120], "Import HLAE CamIO");
    importCam.onClick = ImportCamFunc;

    UI.add("statictext", [105, 140, 230, 160], "script by xNWP");
    UI.add("statictext", [82, 155, 230, 173], "https://github.com/xNWP");

    // Don't really have a firm grasp on how AEES formats element location,
    // have an idea but not for sure, values were just thrown in until it looked good :-)

    return UI;
}

function RadToDeg(angle) {
    return angle * 180 / Math.PI;
}

function DegToRad(angle) {
    return angle * Math.PI / 180;
}

/* matrix multiplication, M premultiplies oM */
function Mmul(M, oM) {
    var out = [[1,0,0],[0,1,0],[0,0,1]];
    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            out[i][j] = 0;
            for (var k = 0; k < 3; k++) {
                out[i][j] += M[i][k] * oM[k][j];
            }
        }
    }
    return out;    
}

/* generates rotation matrices for angle around basis vector */
function RotMatX(angle) {
    var cx = Math.cos(angle);
    var sx = Math.sin(angle);
    var out = [
        [1,  0,   0],
        [0, cx, -sx],
        [0, sx,  cx]];
    return out;
}

function RotMatY(angle) {
    var cx = Math.cos(angle);
    var sx = Math.sin(angle);
    var out = [
        [ cx, 0, sx],
        [  0, 1,  0],
        [-sx, 0, cx]];
    return out;
}

function RotMatZ(angle) {
    var cx = Math.cos(angle);
    var sx = Math.sin(angle);
    var out = [
        [cx, -sx, 0],
        [sx,  cx, 0],
        [ 0,   0, 1]];
    return out;
}

/* Enter Main */
var UI = CreateUI(this);

UI.center();
UI.show();