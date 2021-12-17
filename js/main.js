
(function () 
{
    let MSAA = document.getElementById('MSAAOn')
    let TAA  = document.getElementById('TAAOn')
    let DoF  = document.getElementById('DoFOn')

    var canvas = document.getElementById('canv')
    var gl = canvas.getContext("webgl2")
    var ui = document.getElementById("ui")
    var notes = document.getElementById("notes")
    var controls = document.getElementById("controls")
    var size = document.getElementById("size")

    var extensions = gl.getSupportedExtensions();
    console.log(extensions)
    gl.getExtension('EXT_color_buffer_float');

    let FORWARD = vec4(0.0, 0.0, -1.0, 0.0);
    let RIGHT = vec4(1.0, 0.0, 0.0, 0.0);
    let UP = vec4(0.0, 1.0, 0.0, 0.0);

    // SHADERS
    console.log(basePassVertexShaderSource)
    var basePassShaderProgram  = createProgram (gl, 
        createShader  (gl, gl.VERTEX_SHADER,   basePassVertexShaderSource), 
        createShader  (gl, gl.FRAGMENT_SHADER, basePassFragmentShaderSourceHeader + voxelShaderSource + basePassFragmentShaderSourceBody));

    var LightingPassShaderProgram  = createProgram (gl, 
        createShader  (gl, gl.VERTEX_SHADER, LightingPassVertexShaderSource), 
        createShader  (gl, gl.FRAGMENT_SHADER, 
            LightingPassFragmentShaderHeaderSource +
            voxelShaderSource + 
            LightingPassFragmentShaderFooterSource));

    var TAAPassShaderProgram = createProgram(gl,
        createShader(gl, gl.VERTEX_SHADER, TAAPassVertexShaderSource),
        createShader(gl, gl.FRAGMENT_SHADER, 
            TAAPassFragmentShaderHeaderSource +
            TAAPassFragmentShaderFooterSource))

    var BlurPassShaderProgram = createProgram(gl,
        createShader(gl, gl.VERTEX_SHADER, BlurPassVertexShaderSource),
        createShader(gl, gl.FRAGMENT_SHADER, BlurPassFragmentShaderSource))

    var DoFPassShaderProgram = createProgram(gl,
        createShader(gl, gl.VERTEX_SHADER, DoFVertexShaderSource),
        createShader(gl, gl.FRAGMENT_SHADER, DoFFragmentShaderSource))

    // FRAME BUFFERS
    var albedoBuffer   = createColourTexture(gl,   Math.floor(canvas.width), Math.floor(canvas.height), gl.RGBA, gl.UNSIGNED_BYTE)
    var normalBuffer   = createColourTexture(gl,   Math.floor(canvas.width), Math.floor(canvas.height), gl.RGBA, gl.UNSIGNED_BYTE)
    var worldposBuffer = createColourTexture(gl,   Math.floor(canvas.width), Math.floor(canvas.height), gl.RGBA32F, gl.FLOAT)
    var depthBuffer    = createDepthTexture(gl,    Math.floor(canvas.width), Math.floor(canvas.height))

    var albedoBufferFrameBufferWrite = createFramebuffer(gl, albedoBuffer);
    var normalBufferFrameBufferWrite = createFramebuffer(gl, normalBuffer);
    var worldposBufferFrameBufferWrite = createFramebuffer(gl, worldposBuffer);

    var basePassFrameBuffer = createFramebuffer(gl, 
        albedoBuffer, 
        normalBuffer,
        worldposBuffer,
        depthBuffer)

    // MSAA Frame Buffers
    var MSAAFramebufferA = gl.createFramebuffer();

    gl.bindFramebuffer(gl.FRAMEBUFFER, MSAAFramebufferA);

    var albedoRenderbuffer   = gl.createRenderbuffer(); 
    gl.bindRenderbuffer(gl.RENDERBUFFER, albedoRenderbuffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER,
        gl.getParameter(gl.MAX_SAMPLES),
        gl.RGBA8, 
        canvas.width,
        canvas.height);

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT0, 
        gl.RENDERBUFFER, 
        albedoRenderbuffer);

    var normalRenderbuffer   = gl.createRenderbuffer(); 
    gl.bindRenderbuffer(gl.RENDERBUFFER, normalRenderbuffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER,
        gl.getParameter(gl.MAX_SAMPLES),
        gl.RGBA8, 
        canvas.width,
        canvas.height);

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT1, 
        gl.RENDERBUFFER, 
        normalRenderbuffer);

    var worldposRenderBuffer = gl.createRenderbuffer(); 
    gl.bindRenderbuffer(gl.RENDERBUFFER, worldposRenderBuffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER,
        gl.getParameter(gl.MAX_SAMPLES),
        gl.RGBA32F, 
        canvas.width,
        canvas.height);

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT2, 
        gl.RENDERBUFFER, 
        worldposRenderBuffer);
    
    var depthRenderbuffer   = gl.createRenderbuffer(); 
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER,
        gl.getParameter(gl.MAX_SAMPLES),
        gl.DEPTH_COMPONENT24, 
        canvas.width,
        canvas.height);

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, 
        gl.DEPTH_ATTACHMENT, 
        gl.RENDERBUFFER, 
        depthRenderbuffer);

    var albedoBufferFrameBufferRead = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, albedoBufferFrameBufferRead);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT0, 
        gl.RENDERBUFFER, 
        albedoRenderbuffer);

    var normalBufferFrameBufferRead = createFramebuffer(gl, normalBuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, normalBufferFrameBufferRead);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT0, 
        gl.RENDERBUFFER, 
        normalRenderbuffer);

    var worldposBufferFrameBufferRead = createFramebuffer(gl, worldposBuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, worldposBufferFrameBufferRead);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, 
        gl.COLOR_ATTACHMENT0, 
        gl.RENDERBUFFER, 
        worldposRenderBuffer);
    // MSAA
    
    // TAA History
    let NumHistorySamples = 15;
    var LightingBuffers = [NumHistorySamples]
    for (var i = 0; i < NumHistorySamples; ++i)
        LightingBuffers[i] = createColourTexture(gl, 
            canvas.width, 
            canvas.height, 
            gl.RGBA, gl.UNSIGNED_BYTE)

    var AABuffer = createColourTexture(gl, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE)
    var AAFrameBuffer = createFramebuffer(gl, 
        AABuffer)

    var ViewTransforms = [NumHistorySamples]
    for (var i = 0; i < NumHistorySamples; ++i)
        ViewTransforms[i] = identity()

    var LightingPassFrameBuffer = createFramebuffer(gl, LightingBuffers[0])
    // TAA History

    var BlurBufferA = createColourTexture(gl, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE)
    var BlurFrameBufferA = createFramebuffer(gl, 
        BlurBufferA)
    var BlurBufferB = createColourTexture(gl, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE)
    var BlurFrameBufferB = createFramebuffer(gl, 
        BlurBufferB)
    
    // TEXTURES
    var PerlinNoiseTexture = loadTexture(gl, 'images/noise/simplex.png')
    var WhiteNoiseTexture = loadTexture(gl, 'images/noise/white.png')
    var BlueNoiseTexture = loadTexture(gl, 'images/noise/blue.png')

    var VoxelTextureData
    var VoxelTexture

    // UNIFORMS
    var basePassTransformLocation = gl.getUniformLocation(basePassShaderProgram, "transform")
    var basePassViewMatrixLocation = gl.getUniformLocation(basePassShaderProgram, "view");
    var basePassProjMatrixLocation = gl.getUniformLocation(basePassShaderProgram, "proj")
    var basePassWindowSizeLocation = gl.getUniformLocation(basePassShaderProgram, "WindowSize")
    var basePassTimeUniform = gl.getUniformLocation(basePassShaderProgram, "Time")
    var basePassJitterUniform = gl.getUniformLocation(basePassShaderProgram, "ShouldJitter")

    var basePassCameraPositionUniform = gl.getUniformLocation(basePassShaderProgram, "CameraPosition")
    var basePassVolumePositionUniform = gl.getUniformLocation(basePassShaderProgram, "VolumePosition")
    var basePassVolumeSizeUniform = gl.getUniformLocation(basePassShaderProgram, "VolumeSize")
    var basePassSelectedVoxelUniform = gl.getUniformLocation(basePassShaderProgram, "SelectedVoxel")
    var basePassPerlinNoiseSampler = gl.getUniformLocation(basePassShaderProgram, "PerlinNoise");

    var basePassVoxelTextureSampler = gl.getUniformLocation(basePassShaderProgram, "VoxelTexture")

    var LightingPassProjectionUniform = gl.getUniformLocation(LightingPassShaderProgram, "projection")
    var LightingPassViewUniform = gl.getUniformLocation(LightingPassShaderProgram, "view");
    var LightingPassNearUniform = gl.getUniformLocation(LightingPassShaderProgram, "near")
    var LightingPassFarUniform = gl.getUniformLocation(LightingPassShaderProgram, "far")
    var LightingPassJitterUniform = gl.getUniformLocation(LightingPassShaderProgram, "ShouldJitter");
    var LightingPassPerlinNoiseSampler = gl.getUniformLocation(LightingPassShaderProgram, "PerlinNoise")
    var LightingPassWhiteNoiseSampler = gl.getUniformLocation(LightingPassShaderProgram, "WhiteNoise")
    var LightingPassBlueNoiseSampler= gl.getUniformLocation(LightingPassShaderProgram, "BlueNoise")

    var LightingPassWorldTextureSampler = gl.getUniformLocation(LightingPassShaderProgram, "WorldTexture");

    var LightingPassAlbedoSampler = gl.getUniformLocation(LightingPassShaderProgram, "AlbedoBuffer");
    var LightingPassNormalSampler = gl.getUniformLocation(LightingPassShaderProgram, "NormalBuffer");
    var LightingPassUVSampler     = gl.getUniformLocation(LightingPassShaderProgram, "PositionBuffer");
    var LightingPassTimeUniform = gl.getUniformLocation(LightingPassShaderProgram, "Time")
    var LightingPassCameraPositionUniform = gl.getUniformLocation(LightingPassShaderProgram, "CameraPosition")
    var LightingPassVolumePositionUniform = gl.getUniformLocation(LightingPassShaderProgram, "VolumePosition")
    var LightingPassVolumeSizeUniform = gl.getUniformLocation(LightingPassShaderProgram, "VolumeSize")
    var LightingPassViewToWorldUniform = gl.getUniformLocation(LightingPassShaderProgram, "ViewToWorld");
    var LightingPassWorldToViewUniform = gl.getUniformLocation(LightingPassShaderProgram, "WorldToView")
    var LightingPassShadingModeUniform = gl.getUniformLocation(LightingPassShaderProgram, "ShadingMode")
    var LightingPassSelectedVoxelUniform = gl.getUniformLocation(LightingPassShaderProgram, "SelectedVoxel")
    var LightingPassVoxelTextureUniform = gl.getUniformLocation(LightingPassShaderProgram, "VoxelTexture");

    var LightingPassLightDirectionUniform = gl.getUniformLocation(LightingPassShaderProgram, "LightDirection")
    var LightingPassLightPositionUniform = gl.getUniformLocation(LightingPassShaderProgram, "LightPosition")
    var LightingPassLightColourUniform = gl.getUniformLocation(LightingPassShaderProgram, "LightColour")
    var LightingPassLightOnUniform = gl.getUniformLocation(LightingPassShaderProgram, "Light")

    var TAAPassWorldPositionBufferSampler = gl.getUniformLocation(TAAPassShaderProgram, "WorldPositionBuffer")
    var TAAPassDepthBufferSampler = gl.getUniformLocation(TAAPassShaderProgram, "DepthBuffer")
    var TAAPassFrameBufferSamplers = gl.getUniformLocation(TAAPassShaderProgram, "Frames")

    var TAAPassView0Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View0")
    var TAAPassView1Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View1")
    var TAAPassView2Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View2")
    var TAAPassView3Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View3")
    var TAAPassView4Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View4")
    var TAAPassView5Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View5")
    var TAAPassView6Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View6")
    var TAAPassView7Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View7")
    var TAAPassView8Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View8")
    var TAAPassView9Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View9")
    var TAAPassView10Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View10")
    var TAAPassView11Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View11")
    var TAAPassView12Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View12")
    var TAAPassView13Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View13")
    var TAAPassView14Uniform = gl.getUniformLocation(TAAPassShaderProgram, "View14")

    var TAAPassCameraPositionUniform = gl.getUniformLocation(TAAPassShaderProgram, "CameraPosition")
    var TAAPassCameraForwardUniform = gl.getUniformLocation(TAAPassShaderProgram, "CameraForward")

    var TAAPassNearUniform = gl.getUniformLocation(TAAPassShaderProgram, "Near")
    var TAAPassFarUniform = gl.getUniformLocation(TAAPassShaderProgram, "Far")
    var TAAPassTimeUniform = gl.getUniformLocation(TAAPassShaderProgram, "Time")
    
    var BlurPassFrameUniform = gl.getUniformLocation(BlurPassShaderProgram, "FrameTexture")
    var BlurPassHorizontalUniform = gl.getUniformLocation(BlurPassShaderProgram, "Horizontal");

    var DoFPassBluredFrameUniform = gl.getUniformLocation(DoFPassShaderProgram, "BlurredScene");
    var DoFPassUnblurredFrameUniform = gl.getUniformLocation(DoFPassShaderProgram, "UnblurredScene")
    var DoFPassDepthUniform = gl.getUniformLocation(DoFPassShaderProgram, "WorldPositionBuffer");

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

    function BuildScene()
    {
        let SIZE = 64;
        VolumeSize = [SIZE, SIZE, SIZE]
        VoxelTextureData = new Uint8Array(SIZE * SIZE * SIZE);
        for (var z = 0; z < SIZE; ++z) {
            for (var y = 0; y < SIZE; ++y) {
                for (var x = 0; x < SIZE; ++x) {

                    let height = Math.max(noise(x * 0.5, z * 0.5) * 0.5, SIZE * 0.25);
                    if (y < height)
                    {
                        VoxelTextureData[x + y * SIZE + z * SIZE * SIZE] = 255;
                    }
                    else
                    {
                        VoxelTextureData[x + y * SIZE + z * SIZE * SIZE] = 0;
                    }    
                }
            }
        }

        VoxelTexture = createVolumeTexture(gl, VoxelTextureData, SIZE);

        Volume = identity();
        Volume = multiplym(scale(VolumeSize[0] * 0.5, VolumeSize[1] * 0.5, VolumeSize[2] * 0.5), Volume);
        Volume = multiplym(translate(VolumePosition[0], VolumePosition[1], VolumePosition[2]), Volume);
    }

    var IntersectionVoxelIndex = [ -1, -1, -1 ]

    function UpdateScene()
    {
        IntersectionVoxelIndex = IntersectVolume(
            VolumeSize,
            VolumePosition,
            VoxelTextureData,
            CameraPosition,
            CameraForward
        )

        if (IntersectionVoxelIndex[0] != -1 && SpacePressed)
        {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_3D, VoxelTexture);
        
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_BASE_LEVEL, 0);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAX_LEVEL, 0);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);        

            VoxelTextureData[IntersectionVoxelIndex[0] + IntersectionVoxelIndex[1]  * VolumeSize[0] + IntersectionVoxelIndex[2] * VolumeSize[0] * VolumeSize[0]] = 0;
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
    
    // CAMERA
    var CameraPosition = vec4(0.0, 0.0, 0.0, 1.0)
    var CameraVelocity = vec4(0.0, 0.0, 0.0, 0.0)
    var CameraAcceleration = vec4(0.0, 0.0, 0.0, 0.0)

    var CameraRotation = new Float32Array([0.0, 0.0, 0.0])
    var CameraAngularVelocity = new Float32Array([0.0, 0.0, 0.0])

    var LastCameraPosition = CameraPosition
    var LastCameraRotation = CameraRotation
    var ViewTransformHasChanged = true;

    var Near = 0.1
    var Far = 1000.0
    var FOV = 45.0;

    var projMatrix        = identity();
    var worldToViewMatrix = identity();
    var viewToWorldMatrix = identity();
    var modelMatrix       = identity();

    //    ax + by + cz + d = 0
    var FrustumTop    = [ 0.0, 0.0, 0.0, 0.0 ]
    var FrustumBottom = [ 0.0, 0.0, 0.0, 0.0 ]
    var FrustumFront  = [ 0.0, 0.0, 0.0, 0.0 ]
    var FrustumBack   = [ 0.0, 0.0, 0.0, 0.0 ]
    var FrustumLeft   = [ 0.0, 0.0, 0.0, 0.0 ]
    var FrustumRight  = [ 0.0, 0.0, 0.0, 0.0 ]

    var CameraForward = FORWARD;
    var CameraRight = RIGHT;
    var CameraUp = UP;

    function ComputeView () 
    {
        projMatrix = perspective(FOV, Near, Far, canvas.clientWidth, canvas.clientHeight)

        worldToViewMatrix = identity()
        worldToViewMatrix = multiplym(translate(-CameraPosition[0], -CameraPosition[1], -CameraPosition[2]), worldToViewMatrix)
        worldToViewMatrix = multiplym(rotate(CameraRotation[0], CameraRotation[1], CameraRotation[2]), worldToViewMatrix) 
        
        viewToWorldMatrix = identity()
        viewToWorldMatrix = multiplym(translate(CameraPosition[0], CameraPosition[1], CameraPosition[2]), viewToWorldMatrix)
        viewToWorldMatrix = multiplym(rotateRev(-CameraRotation[0], -CameraRotation[1], -CameraRotation[2]), viewToWorldMatrix)

        CameraForward = normalize(multiplyv(FORWARD, viewToWorldMatrix))
        CameraRight = normalize(multiplyv(RIGHT, viewToWorldMatrix))
        CameraUp = normalize(multiplyv(UP, viewToWorldMatrix))

        let viewProj = identity()
        viewProj = multiplym(projMatrix, worldToViewMatrix)

        FrustumLeft   = [ access(viewProj, 0, 3) + access(viewProj, 0, 0), access(viewProj, 1, 3) + access(viewProj, 1, 0), access(viewProj, 2, 3) + access(viewProj, 2, 0), access(viewProj, 3, 3) + access(viewProj, 3, 0)]
        FrustumRight  = [ access(viewProj, 0, 3) - access(viewProj, 0, 0), access(viewProj, 1, 3) - access(viewProj, 1, 0), access(viewProj, 2, 3) - access(viewProj, 2, 0), access(viewProj, 3, 3) - access(viewProj, 3, 0)]
        FrustumTop    = [ access(viewProj, 1, 3) - access(viewProj, 1, 1), access(viewProj, 2, 3) - access(viewProj, 2, 1), access(viewProj, 0, 3) - access(viewProj, 0, 1), access(viewProj, 3, 3) - access(viewProj, 3, 1)]
        FrustumBottom = [ access(viewProj, 0, 3) + access(viewProj, 0, 1), access(viewProj, 1, 3) + access(viewProj, 1, 1), access(viewProj, 2, 3) + access(viewProj, 2, 1), access(viewProj, 3, 3) + access(viewProj, 3, 1)]
        FrustumFront  = [ access(viewProj, 0, 3) + access(viewProj, 0, 2), access(viewProj, 1, 3) + access(viewProj, 1, 2), access(viewProj, 2, 3) + access(viewProj, 2, 2), access(viewProj, 3, 3) + access(viewProj, 3, 2)]
        FrustumBack   = [ access(viewProj, 0, 3) - access(viewProj, 0, 2), access(viewProj, 1, 3) - access(viewProj, 1, 2), access(viewProj, 2, 3) - access(viewProj, 2, 2), access(viewProj, 3, 3) - access(viewProj, 3, 2)]

        var LastView = ViewTransforms.pop();
        ViewTransforms.unshift(multiplym(projMatrix, worldToViewMatrix))
        
        var LastBuffer = LightingBuffers.pop();
        LightingBuffers.unshift(LastBuffer);
    }

    // RENDER PASSES
    function BasePass () 
    {
        gl.viewport(0, 0, canvas.width, canvas.height);

        if (MSAA.checked)
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, MSAAFramebufferA);
        }
        else
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, basePassFrameBuffer)
        }

        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.clear(gl.DEPTH_BUFFER_BIT)
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST)
    //    gl.depthRange(Near, Far);
        gl.disable(gl.BLEND)
        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0, 
            gl.COLOR_ATTACHMENT1,
            gl.COLOR_ATTACHMENT2]);
        gl.useProgram(basePassShaderProgram);

        gl.uniform1i(basePassVoxelTextureSampler, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_3D, VoxelTexture);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, PerlinNoiseTexture);
        gl.uniform1i(basePassPerlinNoiseSampler, 1);

        gl.uniform2fv(basePassWindowSizeLocation, [canvas.width, canvas.height])
        gl.uniform1f(basePassTimeUniform, frameID);
        gl.uniformMatrix4fv(basePassProjMatrixLocation, false, projMatrix)
        gl.uniformMatrix4fv(basePassViewMatrixLocation, false, worldToViewMatrix)
        gl.uniform1i(basePassJitterUniform, TAA.checked ? 1 : 0);
        gl.uniform4fv(basePassCameraPositionUniform, CameraPosition)
        gl.uniform3fv(basePassVolumePositionUniform, VolumePosition)
        gl.uniform3fv(basePassVolumeSizeUniform, VolumeSize)
        gl.uniform3iv(basePassSelectedVoxelUniform,IntersectionVoxelIndex);
        gl.bindVertexArray(boxGeometryVertexArray);

        gl.uniformMatrix4fv(basePassTransformLocation, false, Volume);

        gl.drawArraysInstanced(gl.TRIANGLES, 0, boxGeometryPositions.length / 3, 1);

        if (MSAA.checked)
        {
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, albedoBufferFrameBufferRead);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, albedoBufferFrameBufferWrite);
            gl.blitFramebuffer(
                0, 0, canvas.width, canvas.height,
                0, 0, canvas.width, canvas.height,
                gl.COLOR_BUFFER_BIT, gl.LINEAR);
            
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, normalBufferFrameBufferRead);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, normalBufferFrameBufferWrite);
            gl.blitFramebuffer(
                0, 0, canvas.width, canvas.height,
                0, 0, canvas.width, canvas.height,
                gl.COLOR_BUFFER_BIT, gl.LINEAR);
    
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, worldposBufferFrameBufferRead);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, worldposBufferFrameBufferWrite);
            gl.blitFramebuffer(
                0, 0, canvas.width, canvas.height,
                0, 0, canvas.width, canvas.height,
                gl.COLOR_BUFFER_BIT, gl.LINEAR);
        }

//        gl.disable(gl.DEPTH_TEST)
//        gl.depthMask(false);
    }

    function LightingPass () 
    {
        gl.viewport(0, 0, canvas.width, canvas.height);

        if (TAA.checked)
        {
            LightingPassFrameBuffer = createFramebuffer(gl, LightingBuffers[0])
            gl.bindFramebuffer(gl.FRAMEBUFFER, LightingPassFrameBuffer);
        }
        else
        {
            if (DoF.checked)
            {
                gl.bindFramebuffer(gl.FRAMEBUFFER, AAFrameBuffer);
            }
            else
            {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            }
        }

        gl.useProgram(LightingPassShaderProgram);

        gl.uniformMatrix4fv(LightingPassProjectionUniform, false, projMatrix)
        gl.uniformMatrix4fv(LightingPassViewUniform, false, worldToViewMatrix)
        gl.uniform1f(LightingPassNearUniform, Near)
        gl.uniform1f(LightingPassFarUniform, Far)
        gl.uniform1i(LightingPassJitterUniform, TAA.checked ? 1 : 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, albedoBuffer);
        gl.uniform1i(LightingPassAlbedoSampler, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, normalBuffer);
        gl.uniform1i(LightingPassNormalSampler, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, worldposBuffer);
        gl.uniform1i(LightingPassUVSampler, 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, PerlinNoiseTexture);
        gl.uniform1i(LightingPassPerlinNoiseSampler, 3);

        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, WhiteNoiseTexture);
        gl.uniform1i(LightingPassWhiteNoiseSampler, 4);

        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, BlueNoiseTexture);
        gl.uniform1i(LightingPassBlueNoiseSampler, 5);

        gl.activeTexture(gl.TEXTURE6);
        gl.uniform1i(LightingPassVoxelTextureUniform, 6);
        gl.bindTexture(gl.TEXTURE_3D, VoxelTexture);

        gl.uniform1f(LightingPassTimeUniform, frameID);

        gl.uniform4fv(LightingPassCameraPositionUniform, CameraPosition);
        gl.uniform3fv(LightingPassVolumePositionUniform, VolumePosition);
        gl.uniform3fv(LightingPassVolumeSizeUniform, VolumeSize);
        gl.uniform3iv(LightingPassSelectedVoxelUniform, IntersectionVoxelIndex);
        gl.uniformMatrix4fv(LightingPassViewToWorldUniform, false, (viewToWorldMatrix))
        gl.uniformMatrix4fv(LightingPassWorldToViewUniform, false, (worldToViewMatrix))

        gl.uniform3fv(LightingPassLightDirectionUniform, [CameraForward[0], CameraForward[1], CameraForward[2]])
        gl.uniform3fv(LightingPassLightPositionUniform,  [CameraPosition[0], CameraPosition[1], CameraPosition[2] ]);
        gl.uniform3fv(LightingPassLightColourUniform, [ 1.0, 0.3, 0.1 ]);
        gl.uniform1i(LightingPassLightOnUniform, LightOn ? 1 : 0)

        gl.bindVertexArray(screenGeometryVertexArray);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.disable(gl.BLEND)
    }

    function TAAPass () 
    {
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (DoF.checked)
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, AAFrameBuffer);
        }
        else
        {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        gl.clearColor(0.0, 0.0, 0.0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(TAAPassShaderProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, worldposBuffer);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, depthBuffer);

        gl.uniform1i(TAAPassWorldPositionBufferSampler, 0);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[0]);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[1]);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[2]);
        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[3]);
        gl.activeTexture(gl.TEXTURE6);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[4]);
        gl.activeTexture(gl.TEXTURE7);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[5]);
        gl.activeTexture(gl.TEXTURE8);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[6]);
        gl.activeTexture(gl.TEXTURE9);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[7]);
        gl.activeTexture(gl.TEXTURE10);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[8]);
        gl.activeTexture(gl.TEXTURE11);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[9])
        gl.activeTexture(gl.TEXTURE12);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[10]);
        gl.activeTexture(gl.TEXTURE13);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[11])
        gl.activeTexture(gl.TEXTURE14);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[12])
        gl.activeTexture(gl.TEXTURE15);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[13])
        gl.activeTexture(gl.TEXTURE16);
        gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[14])
        
        gl.uniform1iv(TAAPassFrameBufferSamplers, [ 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])

        gl.uniformMatrix4fv(TAAPassView0Uniform,  false, ViewTransforms[0])
        gl.uniformMatrix4fv(TAAPassView1Uniform,  false, ViewTransforms[1])
        gl.uniformMatrix4fv(TAAPassView2Uniform,  false, ViewTransforms[2])
        gl.uniformMatrix4fv(TAAPassView3Uniform,  false, ViewTransforms[3])
        gl.uniformMatrix4fv(TAAPassView4Uniform,  false, ViewTransforms[4])
        gl.uniformMatrix4fv(TAAPassView5Uniform,  false, ViewTransforms[5])
        gl.uniformMatrix4fv(TAAPassView6Uniform,  false, ViewTransforms[6])
        gl.uniformMatrix4fv(TAAPassView7Uniform,  false, ViewTransforms[7])
        gl.uniformMatrix4fv(TAAPassView8Uniform,  false, ViewTransforms[8])
        gl.uniformMatrix4fv(TAAPassView9Uniform,  false, ViewTransforms[9])
        gl.uniformMatrix4fv(TAAPassView10Uniform,  false, ViewTransforms[10])
        gl.uniformMatrix4fv(TAAPassView11Uniform,  false, ViewTransforms[11])
        gl.uniformMatrix4fv(TAAPassView12Uniform,  false, ViewTransforms[12])
        gl.uniformMatrix4fv(TAAPassView13Uniform,  false, ViewTransforms[13])
        gl.uniformMatrix4fv(TAAPassView14Uniform,  false, ViewTransforms[14])

        gl.uniform4fv(TAAPassCameraPositionUniform, CameraPosition)
        gl.uniform4fv(TAAPassCameraForwardUniform, multiplyv(FORWARD, viewToWorldMatrix))
        gl.uniform1f(TAAPassNearUniform, Near);
        gl.uniform1f(TAAPassFarUniform, Far);
        gl.uniform1f(TAAPassTimeUniform, frameID);

        gl.bindVertexArray(screenGeometryVertexArray);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        
        // Using the anti-aliased image as the history sample
        // much better quality, bad ghosting
        //gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[0])
        //gl.copyTexImage2D(
        //    gl.TEXTURE_2D, 
        //    0,
        //    gl.RGBA, 
        //    0, 0,
        //    canvas.width,
        //    canvas.height,
        //    0);
    }

    function BlurPass()
    {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, BlurFrameBufferA);
        gl.clearColor(0.0, 0.0, 0.0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(BlurPassShaderProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, AABuffer);
        gl.uniform1i(BlurPassFrameUniform, 0);
        gl.uniform1i(BlurPassHorizontalUniform, 0);
        gl.bindVertexArray(screenGeometryVertexArray);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindFramebuffer(gl.FRAMEBUFFER, BlurFrameBufferB);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, BlurBufferA);
        gl.uniform1i(BlurPassFrameUniform, 0);
        gl.uniform1i(BlurPassHorizontalUniform, 1);
        gl.bindVertexArray(screenGeometryVertexArray);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

    }

    function DepthOfFieldPass()
    {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0.0, 0.0, 0.0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(DoFPassShaderProgram);
    
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, BlurBufferB);
        gl.uniform1i(DoFPassBluredFrameUniform, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, AABuffer);
        gl.uniform1i(DoFPassUnblurredFrameUniform, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, worldposBuffer);
        gl.uniform1i(DoFPassDepthUniform, 2);

        gl.bindVertexArray(screenGeometryVertexArray);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function Render () 
    {
        BasePass();
        LightingPass();
        if (TAA.checked) 
        {
            TAAPass();
        }

        if (DoF.checked)
        {
            BlurPass();
            DepthOfFieldPass();
        }

        frameID++;
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
            CameraForward[0].toFixed(1) + ", " + 
            CameraForward[1].toFixed(1) + ", " + 
            CameraForward[2].toFixed(1) + "</p>"

     //   ui.innerHTML +="<p>" + BoxPositions.length / 3 + " boxes in scene </p>";
     //   ui.innerHTML +="<p>" + RasterBoxPositions.length / 3 + " boxes sent to raster </p>";
     //   ui.innerHTML +="<p>" + RTBoxPositions.length / 3 + " boxes in ray tracing </p>";
     //   ui.innerHTML +="<p>" + Culled + " culled with dot </p>";

        size.innerHTML = "<p>" + canvas.width + " x " + canvas.height + "</p>"
        size.innerHTML += "<p>" + canvas.clientWidth + " x " + canvas.clientHeight + "</p>"
        size.innerHTML += "<p>" + DisplayedFrameTime + "ms" + "</p>" 

        LastLoopEnded = Date.now();
        if (frameID % FramerateTickInterval == 0)
        {
            DisplayedFrameTime = TimeSinceLastUpdate;
        }
       
    //    setInterval(Loop, 33);
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

    var LightOn = false;

    function PollInput() 
    {      
        var speed = 0.0125
        if (ShiftPressed)
        {
            speed = 0.02;
        }

        var CameraForwardXZ = [
            CameraForward[0],
            0.0,
            CameraForward[2],
            0.0
        ]

        if (DPressed) CameraVelocity = addv(CameraVelocity, multiplys(CameraRight,  speed))
        if (APressed) CameraVelocity = addv(CameraVelocity, multiplys(CameraRight, -speed))
        if (WPressed) CameraVelocity = addv(CameraVelocity, multiplys(CameraForwardXZ, speed))
        if (SPressed) CameraVelocity = addv(CameraVelocity, multiplys(CameraForwardXZ, -speed))
//        if (QPressed) CameraVelocity[1] -= speed
//        if (EPressed) CameraVelocity[1] += speed

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

        var VoxelUnderCamera = IntersectVolume(
            VolumeSize,
            VolumePosition,
            VoxelTextureData,
            CameraPosition,
            [ 0.0, -1.0, 0.0 ]
        )

        var VoxelUnderCameraFast= [ 
            (VolumeSize[0] * 0.5) + Math.floor(CameraPosition[0]), 
            (VolumeSize[1] * 0.5) + Math.floor(CameraPosition[1] - CharacterRadius + 0.1), 
            (VolumeSize[2] * 0.5) + Math.floor(CameraPosition[2])];

        if (VoxelUnderCamera[1] != VoxelUnderCameraFast[1])
        {
            console.log(VoxelUnderCameraFast + " | " + VoxelUnderCamera)
        }

        var GroundHeight = (-VolumeSize[1] * 0.5) + VoxelUnderCamera[1]
 

  
            if (CameraPosition[1] > GroundHeight + CharacterRadius || VoxelUnderCamera[2] == -1)
            {
                CameraAcceleration[1] -= Gravity;
            }
            else
            {
                CameraPosition[1] = GroundHeight + CharacterRadius
                if (QPressed)
                {
                    CameraAcceleration[1] += Jump;
                }
            }
        
        QPressed = false;

        var VoxelFrontOfCamera = IntersectVolume(
            VolumeSize,
            VolumePosition,
            VoxelTextureData,
            [CameraPosition[0], CameraPosition[1], CameraPosition[2]],
            [0.0, 0.0, 1.0]
        )

        if (VoxelFrontOfCamera[0] != -1)
        {
            var DistanceToVoxelFront = Math.abs((-VolumeSize[2] * 0.5) + VoxelFrontOfCamera[2] - (CameraPosition[1] - 0.75))
            if (CameraPosition[2] + DistanceToVoxelFront < CharacterRadius)
            {
                CameraVelocity[2] = Math.max(0.0, CameraVelocity[2]);
            }
        }


        CameraPosition = addv(CameraPosition, CameraVelocity)
        CameraVelocity = addv(CameraVelocity, CameraAcceleration)
        CameraVelocity = multiplys(CameraVelocity, 0.9)
        CameraAcceleration = multiplys(CameraAcceleration, 0.9)

        // SCREEN SHAKE
        CameraAngularVelocity[0] += Math.sin(frameID * 0.05) * 0.000025
        CameraAngularVelocity[1] += Math.cos((frameID + 12)* 0.05) * 0.000025

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
            if      (event.key == 'a') APressed = !APressed
            else if (event.key == 'd') DPressed = !DPressed
            else if (event.key == 's') SPressed = !SPressed
            else if (event.key == 'w') WPressed = !WPressed
            else if (event.key == 'ArrowLeft')  LeftArrowPressed  = !LeftArrowPressed
            else if (event.key == 'ArrowRight') RightArrowPressed = !RightArrowPressed
            else if (event.key == 'ArrowUp')    UpArrowPressed    = !UpArrowPressed
            else if (event.key == 'ArrowDown')  DownArrowPressed  = !DownArrowPressed
            else if (event.key == 'Shift') ShiftPressed = !ShiftPressed;
            else if (event.key == ' ') SpacePressed = !SpacePressed;
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
            CameraPosition = vec4(31.0, -14.0, 31.0, 0.0);
            CameraRotation = new Float32Array([0.0,-0.7, -0.5]);
            LightOn = false;
        }


        if (event.key == 'q')
        {
            QPressed = true;
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
    //console.log(CookieRecord);

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