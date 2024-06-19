
(function () 
{

    InitNoise();

    let AO   = document.getElementById('AOOn')
    let Bloom = document.getElementById('BloomOn')
    let TAA  = document.getElementById('TAAOn')
    let DoF  = document.getElementById('DoFOn') 
    let Fog = document.getElementById('FogOn')

    var canvas = document.getElementById('canv')
    var gl = canvas.getContext("webgl2")
    var ui = document.getElementById("ui")
    var notes = document.getElementById("notes")
    var controls = document.getElementById("controls")
    var size = document.getElementById("size")

    //var extensions = gl.getSupportedExtensions();
    //console.log(extensions)
    gl.getExtension('EXT_color_buffer_float');

    // SHADERS
    console.log("compiling basepass shader")
    var basePassShaderProgram  = createProgram (gl, 
        createShader  (gl, gl.VERTEX_SHADER,   basePassVertexShaderSource), 
        createShader  (gl, gl.FRAGMENT_SHADER, basePassFragmentShaderSource));

    const MAX_BUFFER_WIDTH = 1080
    const MAX_BUFFER_HEIGHT = 1080
    canvas.width = Math.min(canvas.clientWidth, MAX_BUFFER_WIDTH)
    canvas.height = Math.min(canvas.clientHeight, MAX_BUFFER_HEIGHT)

    var PreRenderPass          = new BackfacePrePass  (gl, canvas.width, canvas.height)  
    var TAARenderPass          = new TAAPass          (gl, canvas.width, canvas.height)
    var BlurRenderPass         = new BlurPass         (gl, canvas.width, canvas.height)
    var DepthOfFieldRenderPass = new DepthOfFieldPass (gl, canvas.width, canvas.height)
    var FogRenderPass          = new FogPass          (gl, canvas.width, canvas.height)
    var BloomRenderPass        = new BloomPass        (gl, canvas.width, canvas.height)

    // FRAME BUFFERS
    var bloomBuffer = createColourTexture(gl, Math.floor(canvas.width), Math.floor(canvas.height), gl.RGBA32F, gl.FLOAT)

    // TAA History
    let NumHistorySamples = 15;
    var LightingBuffers = [NumHistorySamples]
    for (var i = 0; i < NumHistorySamples; ++i)
        LightingBuffers[i] = createColourTexture(gl, 
            canvas.width, 
            canvas.height, 
            gl.RGBA, gl.UNSIGNED_BYTE)
            
    var WorldPositionBuffers = [NumHistorySamples]
    for (var i = 0; i < NumHistorySamples; ++i)
        WorldPositionBuffers[i] = createColourTexture(gl, 
            canvas.width, 
            canvas.height, 
            gl.RGBA32F, gl.FLOAT)

    var basePassFrameBuffers = [NumHistorySamples]
    for (var i = 0; i < NumHistorySamples; ++i)
        basePassFrameBuffers[i] = createFramebuffer(gl, 
            LightingBuffers[i], 
            WorldPositionBuffers[i], 
            bloomBuffer)

    var ViewTransforms = [NumHistorySamples]
    for (var i = 0; i < NumHistorySamples; ++i)
        ViewTransforms[i] = identity()

    // TEXTURES
    var WhiteNoiseTexture = loadTexture(gl, 'images/noise/white.png')
    var STBNBlueNoiseTextures = []
    for (var i = 0; i < 64; ++i)
    {
        STBNBlueNoiseTextures.push(loadTexture(gl, 'images/noise/STBN/stbn_scalar_2Dx1Dx1D_128x128x64x1_' + i + '.png'))
    }

    var VoxelTextureData
    var VoxelTexture

    // UNIFORMS
    var basePassTransformLocation = gl.getUniformLocation(basePassShaderProgram, "transform")
    var basePassViewMatrixLocation = gl.getUniformLocation(basePassShaderProgram, "view");
    var basePassProjMatrixLocation = gl.getUniformLocation(basePassShaderProgram, "proj")
    var basePassWindowSizeLocation = gl.getUniformLocation(basePassShaderProgram, "WindowSize")
    var basePassTimeUniform = gl.getUniformLocation(basePassShaderProgram, "Time")
    var basePassAmbientOcclusionUniform = gl.getUniformLocation(basePassShaderProgram, "ShouldAmbientOcclusion")
    var basePassJitterUniform = gl.getUniformLocation(basePassShaderProgram, "ShouldJitter")
    var basePassFogUniform = gl.getUniformLocation(basePassShaderProgram, "ShouldFog")
    var basePassCameraPositionUniform = gl.getUniformLocation(basePassShaderProgram, "CameraPosition")
    var basePassVolumePositionUniform = gl.getUniformLocation(basePassShaderProgram, "VolumePosition")
    var basePassVolumeSizeUniform = gl.getUniformLocation(basePassShaderProgram, "VolumeSize")
    var basePassSelectedVoxelUniform = gl.getUniformLocation(basePassShaderProgram, "SelectedVoxel")
    var basePassVoxelTextureSampler = gl.getUniformLocation(basePassShaderProgram, "VoxelTexture")
    var basePassWhiteNoiseSampler = gl.getUniformLocation(basePassShaderProgram, "WhiteNoise")
    var basePassBlueNoiseSampler = gl.getUniformLocation(basePassShaderProgram, "BlueNoise")
    var basePassTBufferSampler = gl.getUniformLocation(basePassShaderProgram, "TBuffer")

    // Screen Pass Geometry Resources
    var screenGeometryVertexArray = gl.createVertexArray();
    gl.bindVertexArray(screenGeometryVertexArray);

    var screenGeometryPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, screenGeometryPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, screenGeometryPositions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    var screenGeometryUVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, screenGeometryUVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, screenGeometryUVs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    // Scene Geometry Resources
    var boxGeometryVertexArray = gl.createVertexArray();
    gl.bindVertexArray(boxGeometryVertexArray);

    var boxGeometryPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxGeometryPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, boxGeometryPositions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    var boxGeometryNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxGeometryNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, boxGeometryNormals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    var boxGeometryUVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boxGeometryUVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, boxGeometryUVs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);

    // SCENE
    var Volume
    var VolumePosition = [ 0.0, 0.0, 0.0 ]
    var VolumeSize = [ 4.0, 4.0, 4.0]
    var NVoxels = 0

    function BuildScene()
    {
        NVoxels = 0
        VolumeSize = [512.0, 128.0, 512.0]
        VoxelTextureData = new Uint8Array(VolumeSize[0] * VolumeSize[1] * VolumeSize[2]);
        for (var z = 0; z < VolumeSize[2]; ++z) 
        {
            for (var y = 0; y < VolumeSize[1]; ++y) 
            {
                for (var x = 0; x < VolumeSize[0]; ++x) 
                {
                    var n1 = noise(x * 0.015234, y * 0.011354, z * 0.053421) * (VolumeSize[1] * 0.85523)
                    var n2 = noise(x * 0.012348, z * 0.016542, 0.0) * (VolumeSize[1] * 0.155234)
                    var n3 = noise(x * 0.1443, z * 0.124532, 0.0) *(VolumeSize[1] * 0.6345) * 0.001

                    //var n1 = noise(x * 0.0015234, y *  0.011354, z * Math.random() * 0.0053421) * (VolumeSize[1] * Math.random() *  0.85523)
                    //var n2 = noise(x * 0.00652348, z * 0.016542, 0.0) * (VolumeSize[1] * Math.random() * 0.0155234)
                    //var n3 = noise(x *0.05243, z  * 0.0124532, 0.0) *(VolumeSize[1] * Math.random() * 0.06345) * 0.001


                    let height = (Math.max(n1 + n2, 6.0));
                   // height = Math.max()
                    //let height = VolumeSize[1] * 0.5
                    if (y < height)
                    {
                        VoxelTextureData[x + y * VolumeSize[0] + z * VolumeSize[2] * VolumeSize[1]] = 255;
                        NVoxels++
                    }
                    else
                    {
                        VoxelTextureData[x + y * VolumeSize[0] + z * VolumeSize[2] * VolumeSize[1]] = 0;
                    }   

                }
            }
        }

        var x = VolumeSize[0] * 0.5
        var y = 9
        var z = VolumeSize[2] * 0.5
        VoxelTextureData[x + y * VolumeSize[0] + z * VolumeSize[2] * VolumeSize[1]] = 51

        VoxelTexture = createVolumeTexture(gl, VoxelTextureData, VolumeSize);

        Volume = identity();
        Volume = multiplym(scale(VolumeSize[0] * 0.5, VolumeSize[1] * 0.5, VolumeSize[2] * 0.5), Volume);
        Volume = multiplym(translate(VolumePosition[0], VolumePosition[1], VolumePosition[2]), Volume);
    }

    var IntersectionVoxelIndex = [ -1, -1, -1 ]

    function UpdateScene()
    {
        if (SpacePressed)
        {
            IntersectionVoxelIndex = IntersectVolume(
                VolumeSize,
                VolumePosition,
                VoxelTextureData,
                CameraPosition,
                View.CameraForward
            )
    
            if (IntersectionVoxelIndex[0] != -1)
            {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_3D, VoxelTexture);
            
                gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_BASE_LEVEL, 0);
                gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAX_LEVEL, 0);
                gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);        
    
                VoxelTextureData[IntersectionVoxelIndex[0] + IntersectionVoxelIndex[1]  * VolumeSize[0] + IntersectionVoxelIndex[2] * VolumeSize[2] * VolumeSize[1]] = 0;
                NVoxels--;
                gl.texSubImage3D(
                    gl.TEXTURE_3D,
                    0, 
                    IntersectionVoxelIndex[0], 
                    IntersectionVoxelIndex[1], 
                    IntersectionVoxelIndex[2], 
                    1, 
                    1, 
                    1, 
                    gl.RED, 
                    gl.UNSIGNED_BYTE, 
                    new Uint8Array([ 0 ]));
            }  
        }

        if (LPressed)
            {
                IntersectionVoxelIndex = IntersectVolume(
                    VolumeSize,
                    VolumePosition,
                    VoxelTextureData,
                    CameraPosition,
                    View.CameraForward
                )
        
                if (IntersectionVoxelIndex[0] != -1)
                {
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_3D, VoxelTexture);
                
                    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_BASE_LEVEL, 0);
                    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAX_LEVEL, 0);
                    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);        
        
                    VoxelTextureData[IntersectionVoxelIndex[0] + IntersectionVoxelIndex[1]  * VolumeSize[0] + IntersectionVoxelIndex[2] * VolumeSize[2] * VolumeSize[1]] = 0;
                    NVoxels--;
                    gl.texSubImage3D(
                        gl.TEXTURE_3D,
                        0, 
                        IntersectionVoxelIndex[0], 
                        IntersectionVoxelIndex[1], 
                        IntersectionVoxelIndex[2], 
                        1, 
                        1, 
                        1, 
                        gl.RED, 
                        gl.UNSIGNED_BYTE, 
                        new Uint8Array([ 51 ]));
                }  
            }

    }
    
    // CAMERA
    var CameraPosition = vec4(0.0, 0.0, 0.0, 1.0)
    var CameraVelocity = vec4(0.0, 0.0, 0.0, 0.0)
    var CameraAcceleration = vec4(0.0, 0.0, 0.0, 0.0)

    var CameraRotation = new Float32Array([0.3, -4.4, -0.8])
    var CameraAngularVelocity = new Float32Array([0.0, 0.0, 0.0])

    var LastCameraPosition = CameraPosition
    var LastCameraRotation = CameraRotation
    var ViewTransformHasChanged = true;

    var Near = 0.1
    var Far = 1000.0
    var FOV = 45.0;

    var View = new ViewData(
        CameraPosition, 
        CameraRotation, 
        canvas.clientWidth, 
        canvas.clientHeight, 
        Near, 
        Far, 
        FOV)

    var VolumeMin
    var VolumeMax
    var CameraInVolume

    function ComputeView () 
    {
        View = new ViewData(
            CameraPosition, 
            CameraRotation, 
            canvas.clientWidth, 
            canvas.clientHeight, 
            Near, 
            Far, 
            FOV)

        VolumeMin = [
            VolumePosition[0] - (VolumeSize[0] * 0.5),
            VolumePosition[1] - (VolumeSize[1] * 0.5),
            VolumePosition[2] - (VolumeSize[2] * 0.5),
        ]
        VolumeMax = [
            VolumePosition[0] + (VolumeSize[0] * 0.5),
            VolumePosition[1] + (VolumeSize[1] * 0.5),
            VolumePosition[2] + (VolumeSize[2] * 0.5),
        ]
        CameraInVolume = 
            VolumeMin[0] < CameraPosition[0] && CameraPosition[0] < VolumeMax[0] &&
            VolumeMin[1] < CameraPosition[1] && CameraPosition[1] < VolumeMax[1] &&
            VolumeMin[2] < CameraPosition[2] && CameraPosition[2] < VolumeMax[2]; 

        var LastView = ViewTransforms.pop();
        ViewTransforms.unshift(multiplym(View.ProjectionMatrix, View.WorldToViewMatrix))
        
        var LastBuffer = LightingBuffers.pop();
        LightingBuffers.unshift(LastBuffer);

        var LastFrameBuffer = basePassFrameBuffers.pop();
        basePassFrameBuffers.unshift(LastFrameBuffer);

        var LastWorldBuffer = WorldPositionBuffers.pop();
        WorldPositionBuffers.unshift(LastWorldBuffer)
    }

    function BasePass () 
    {
        gl.viewport(0, 0, canvas.width, canvas.height);

        if (TAA.checked || Bloom.checked || DoF.checked || Fog.checked)
        {
            //basePassFrameBuffer = createFramebuffer(gl, LightingBuffers[0], WorldPositionBuffers[0], bloomBuffer)
            gl.bindFramebuffer(gl.FRAMEBUFFER, basePassFrameBuffers[0]);
            gl.drawBuffers([
                gl.COLOR_ATTACHMENT0, 
                gl.COLOR_ATTACHMENT1,
                gl.COLOR_ATTACHMENT2]);
        }
        else
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        }

        if (Fog.checked)
        {
            gl.clearColor(0.565, 0.565, 0.565, 0.0);
        }
        else
        {
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
        }

        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.clear(gl.DEPTH_BUFFER_BIT)

        gl.enable(gl.CULL_FACE)

        if (CameraInVolume)
        {
            gl.cullFace(gl.FRONT)
        }
        else
        {
            gl.cullFace(gl.BACK)
        }

        gl.useProgram(basePassShaderProgram);

        gl.uniform1i(basePassVoxelTextureSampler, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, VoxelTexture);

        gl.uniform1i(basePassBlueNoiseSampler, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, STBNBlueNoiseTextures[frameID % 64]);

        gl.uniform1i(basePassWhiteNoiseSampler, 2);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, WhiteNoiseTexture);

        gl.uniform1i(basePassTBufferSampler, 3)
        gl.activeTexture(gl.TEXTURE3)
        gl.bindTexture(gl.TEXTURE_2D, PreRenderPass.output)

        gl.uniform2fv(basePassWindowSizeLocation, [canvas.width, canvas.height])
        gl.uniform1f(basePassTimeUniform, frameID);
        gl.uniformMatrix4fv(basePassProjMatrixLocation, false, View.ProjectionMatrix)
        gl.uniformMatrix4fv(basePassViewMatrixLocation, false, View.WorldToViewMatrix)
        gl.uniform1i(basePassAmbientOcclusionUniform, AO.checked ? 1 : 0)
        gl.uniform1i(basePassJitterUniform, TAA.checked ? 1 : 0);
        gl.uniform1i(basePassFogUniform, Fog.checked ? 1 : 0);
        gl.uniform4fv(basePassCameraPositionUniform, CameraPosition)
        gl.uniform3fv(basePassVolumePositionUniform, VolumePosition)
        gl.uniform3fv(basePassVolumeSizeUniform, VolumeSize)
        gl.uniform3iv(basePassSelectedVoxelUniform, IntersectionVoxelIndex);
        gl.bindVertexArray(boxGeometryVertexArray);

        gl.uniformMatrix4fv(basePassTransformLocation, false, Volume);

        gl.drawArraysInstanced(gl.TRIANGLES, 0, boxGeometryPositions.length / 3, 1);
    
        gl.disable(gl.CULL_FACE)
    }

    function Render () 
    {
        var LastBuffer = null
        if (!CameraInVolume)
        {
            PreRenderPass.Render(
                boxGeometryVertexArray,
                boxGeometryPositions.size / 3,
                View,
                Volume,
                frameID,
                [canvas.width, canvas.height],
                TAA.checked?true:false,
                WhiteNoiseTexture,
                CameraPosition)
        }

        BasePass();
        LastBuffer = LightingBuffers[0]

        if (TAA.checked) 
        {
            TAARenderPass.Render(
                screenGeometryVertexArray,
                LightingBuffers,
                WorldPositionBuffers,
                ViewTransforms,
                Fog.checked||Bloom.checked||DoF.checked?false:true
            )
            LastBuffer = TAARenderPass.outputColour
        }

        if (DoF.checked)
        {
            BlurRenderPass.Render(
                screenGeometryVertexArray,
                LastBuffer,
                2.0)
            DepthOfFieldRenderPass.Render(
                screenGeometryVertexArray,
                LastBuffer,
                BlurRenderPass.output,
                WorldPositionBuffers[0],
                Fog.checked||Bloom.checked?false:true
            )
            LastBuffer = DepthOfFieldRenderPass.output
        }

        /*
        if (Fog.checked)
        {
            FogRenderPass.Render(
                screenGeometryVertexArray,
                LastBuffer,
                WorldPositionBuffers[0],
                Bloom.checked?false:true)
            LastBuffer = FogRenderPass.output
        }
        */

        if (Bloom.checked)
        {
            BlurRenderPass.Render(
                screenGeometryVertexArray,
                TAA.checked?TAARenderPass.outputBloom:bloomBuffer,
                2.0)
            BlurRenderPass.Render(
                screenGeometryVertexArray,
                BlurRenderPass.output,
                8.0)
            BloomRenderPass.Render(
                screenGeometryVertexArray,
                LastBuffer,
                BlurRenderPass.output,
                WorldPositionBuffers[0],
                true)
        }
    }

    var then = 0
    var FramerateTickInterval = 10;
    var DisplayedFrameTime = 0.0;
    var hideUI = false;
    var frameID = 1;

    function Loop () 
    {
        let now = new Date().getMilliseconds();
        let TimeSinceLastUpdate = Math.abs(now - then);
        then = now

        PollInput();
        DoMovement();

        if (ImagesLoaded.every(v => v))
        {
            document.getElementById("loading").style.opacity = "0.0"
            ComputeView();

            UpdateScene();

            Render();
        }

        if (hideUI)
        {
            ui.style.opacity = "0.0";
            notes.style.opacity = "0.0";
            controls.style.opacity = "0.0";
            size.style.opacity = "0.0";
        }
        else
        {
            ui.style.opacity = "1.0";
            notes.style.opacity = "1.0";
            controls.style.opacity = "1.0";
            size.style.opacity = "1.0";
        }

        ui.innerHTML = "<p>" + 
            CameraPosition[0].toFixed(1) + ", " + 
            CameraPosition[1].toFixed(1) + ", " + 
            CameraPosition[2].toFixed(1) + "</p>"
        
        ui.innerHTML += "<p>" + 
            CameraRotation[0].toFixed(1) + ", " + 
            CameraRotation[1].toFixed(1) + ", " + 
            CameraRotation[2].toFixed(1) + "</p>"

        ui.innerHTML +="<p>" + NVoxels.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " boxes in scene </p>";

        size.innerHTML = "<p>" + canvas.width + " x " + canvas.height + "</p>"
        size.innerHTML += "<p>" + canvas.clientWidth + " x " + canvas.clientHeight + "</p>"
        size.innerHTML += "<p>" + DisplayedFrameTime + "ms" + "</p>" 

        LastLoopEnded = Date.now();
        if (frameID % FramerateTickInterval == 0)
        {
            DisplayedFrameTime = TimeSinceLastUpdate;
        }
       
        frameID++;
        requestAnimationFrame(Loop)
    }

    var APressed = false;
    var DPressed = false;
    var WPressed = false;
    var SPressed = false;
    var QPressed = false;
    var EPressed = false;

    var LeftArrowPressed = false;
    var RightArrowPressed = false;

    var UpArrowPressed = false;
    var DownArrowPressed = false;

    var ShiftPressed = false;

    var SpacePressed = false;
    var LPressed = false;

    var LightOn = false;

    function PollInput() 
    {      
        var speed = 0.1
        if (ShiftPressed)
        {
            speed = 0.04
        }

        var CameraForwardXZ = [
            View.CameraForward[0],
            0.0,
            View.CameraForward[2],
            0.0
        ]

        if (DPressed) CameraVelocity = addv(CameraVelocity, multiplys(View.CameraRight,  speed))
        if (APressed) CameraVelocity = addv(CameraVelocity, multiplys(View.CameraRight, -speed))
        if (WPressed) CameraVelocity = addv(CameraVelocity, multiplys(CameraForwardXZ, speed))
        if (SPressed) CameraVelocity = addv(CameraVelocity, multiplys(CameraForwardXZ, -speed))
        if (QPressed) CameraVelocity[1] -= speed
        if (EPressed) CameraVelocity[1] += speed

        var lookSpeed = 0.001
        if (LeftArrowPressed)  CameraAngularVelocity[1] -= lookSpeed;
        if (RightArrowPressed) CameraAngularVelocity[1] += lookSpeed;
        if (UpArrowPressed)    CameraAngularVelocity[0] -= lookSpeed;
        if (DownArrowPressed)  CameraAngularVelocity[0] += lookSpeed;
        
    }

    function DoMovement() 
    {
        var CharacterRadius= 3.0
        var Gravity = 0.001;
        var Jump = 0.03;

        //var VoxelUnderCamera = IntersectVolume(
        //    VolumeSize,
        //    VolumePosition,
        //    VoxelTextureData,
        //    CameraPosition,
        //    [ 0.0, -1.0, 0.0 ]
        //)

        //var VoxelUnderCamera = [ 
        //    (VolumeSize[0] * 0.5) + Math.floor(CameraPosition[0]), 
        //    (VolumeSize[1] * 0.5) + Math.floor(CameraPosition[1] - CharacterRadius + 0.1), 
        //    (VolumeSize[2] * 0.5) + Math.floor(CameraPosition[2])];
        //var GroundHeight = (-VolumeSize[1] * 0.5) + VoxelUnderCamera[1]
        //if (CameraPosition[1] > GroundHeight + CharacterRadius || !TestVoxel(VoxelUnderCamera, VoxelTextureData, VolumeSize))
        //{
        //    CameraAcceleration[1] -= Gravity;
        //}
        //else
        //{
        //    CameraPosition[1] = GroundHeight + CharacterRadius
        //    if (SpacePressed)
        //    {
        //        CameraAcceleration[1] += Jump;
        //    }
        //}
        //SpacePressed = false;

        CameraPosition = addv(CameraPosition, CameraVelocity)
        CameraVelocity = addv(CameraVelocity, CameraAcceleration)
        CameraVelocity = multiplys(CameraVelocity, 0.9)
        CameraAcceleration = multiplys(CameraAcceleration, 0.99)

        //// SCREEN SHAKE
        //CameraAngularVelocity[0] += Math.sin(frameID * 0.05) * 0.000025
        //CameraAngularVelocity[1] += Math.cos((frameID + 12)* 0.05) * 0.000025

        CameraRotation = addv(CameraRotation, CameraAngularVelocity)
        CameraAngularVelocity = multiplys(CameraAngularVelocity, 0.9)

        if (Math.abs(CameraPosition[0] - LastCameraPosition[0]) > 0.000 || 
            Math.abs(CameraPosition[1] - LastCameraPosition[1]) > 0.000 || 
            Math.abs(CameraPosition[2] - LastCameraPosition[2]) > 0.000 ||
            Math.abs(CameraRotation[0] - LastCameraRotation[0]) > 0.000 || 
            Math.abs(CameraRotation[1] - LastCameraRotation[1]) > 0.000 || 
            Math.abs(CameraRotation[2] - LastCameraRotation[2]) > 0.000)
        {
            ViewTransformHasChanged = true
        }
        else
        {
            ViewTransformHasChanged = false
        }

        LastCameraPosition = CameraPosition
        LastCameraRotation = CameraRotation

        document.cookie = "LastCameraX="     + CameraPosition[0];
        document.cookie = "LastCameraY="     + CameraPosition[1];
        document.cookie = "LastCameraZ="     + CameraPosition[2];
        document.cookie = "LastCameraRotationX=" + CameraRotation[0];
        document.cookie = "LastCameraRotationY=" + CameraRotation[1];
        document.cookie = "LastCameraRotationZ=" + CameraRotation[2];
    }

    function flipkey (event) 
    {
        if (!event.repeat)
        {
            if      (event.key == 'a' || event.key == 'A') APressed = !APressed
            else if (event.key == 'd' || event.key == 'D') DPressed = !DPressed
            else if (event.key == 's' || event.key == 'S') SPressed = !SPressed
            else if (event.key == 'w' || event.key == 'W') WPressed = !WPressed
            else if (event.key == 'l' || event.key == "L") LPressed = !LPressed
            else if (event.key == 'ArrowLeft')  LeftArrowPressed  = !LeftArrowPressed
            else if (event.key == 'ArrowRight') RightArrowPressed = !RightArrowPressed
            else if (event.key == 'ArrowUp')    UpArrowPressed    = !UpArrowPressed
            else if (event.key == 'ArrowDown')  DownArrowPressed  = !DownArrowPressed
            else if (event.key == 'Shift') ShiftPressed = !ShiftPressed;
            else if (event.key == ' ') SpacePressed = !SpacePressed;
            else if (event.key == 'e' || event.key == 'E') EPressed = !EPressed
            else if (event.key == 'q' || event.key == 'Q') QPressed = !QPressed
        }

    }

    function handleKeyDown (event)
    {
        if (event.key == 'u')
        {
            hideUI = !hideUI;
        }

        if (event.key == 'r')
        {
           CameraPosition = vec4(0.0, 0.0, 0.0, 0.0);
           CameraRotation = new Float32Array([0.3, -4.4, -0.8])
           LightOn = false;

            // CameraPosition = vec4(31.0, -14.0, 31.0, 0.0);
           // CameraRotation = new Float32Array([0.0,-0.7, -0.5]);
           // LightOn = false;
        }


        if (event.key == ' ')
        {
            SpacePressed = true;
        }

        if (event.key == 'f')
        {
            LightOn = !LightOn
        }
    }

    document.addEventListener('keyup', flipkey)
    document.addEventListener('keydown', flipkey);
    document.addEventListener('keydown', handleKeyDown);

    var CookieRecord = document.cookie;

    var IndividualCookies = CookieRecord.split(' ');
    if (CookieRecord.includes("LastCameraX"))
    {
      for (var i = 0; i < IndividualCookies.length; ++i)
      {
        if      (IndividualCookies[i].includes("LastCameraX")) CameraPosition[0] = parseFloat(IndividualCookies[i].split('=')[1]); 
        else if (IndividualCookies[i].includes("LastCameraY")) CameraPosition[1] = parseFloat(IndividualCookies[i].split('=')[1]); 
        else if (IndividualCookies[i].includes("LastCameraZ")) CameraPosition[2] = parseFloat(IndividualCookies[i].split('=')[1]); 
      }
    }

    if (CookieRecord.includes("LastCameraRotationX"))
    {
      for (var i = 0; i < IndividualCookies.length; ++i)
      {
        if      (IndividualCookies[i].includes("LastCameraRotationX")) CameraRotation[0] = parseFloat(IndividualCookies[i].split('=')[1]); 
        else if (IndividualCookies[i].includes("LastCameraRotationY")) CameraRotation[1] = parseFloat(IndividualCookies[i].split('=')[1]); 
        else if (IndividualCookies[i].includes("LastCameraRotationZ")) CameraRotation[2] = parseFloat(IndividualCookies[i].split('=')[1]); 
      }
    }
    
    BuildScene()
    requestAnimationFrame(Loop)
//    setInterval(Loop, 16);
}())