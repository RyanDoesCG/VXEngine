
(function () 
{
    let MSAA = document.getElementById('MSAAOn')
    let TAA  = document.getElementById('TAAOn')

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

    let MAX_RASTER_PRIMITIVES_PER_BATCH = 400
    let MAX_RT_PRIMITIVES = 256

    // SHADERS
    basePassVertexShaderSource = basePassVertexShaderSource
        .replaceAll("*MAX_RASTER_PRIMITIVES_PER_BATCH*", MAX_RASTER_PRIMITIVES_PER_BATCH.toString())
    basePassFragmentShaderSource = basePassFragmentShaderSource
        .replaceAll("*MAX_RASTER_PRIMITIVES_PER_BATCH*", MAX_RASTER_PRIMITIVES_PER_BATCH.toString())
    LightingPassFragmentShaderHeaderSource = LightingPassFragmentShaderHeaderSource
        .replaceAll("*MAX_RT_PRIMITIVES*", MAX_RT_PRIMITIVES.toString())

    console.log(basePassVertexShaderSource)
    var basePassShaderProgram  = createProgram (gl, 
        createShader  (gl, gl.VERTEX_SHADER,   basePassVertexShaderSource), 
        createShader  (gl, gl.FRAGMENT_SHADER, basePassFragmentShaderSource));

    var LightingPassShaderProgram  = createProgram (gl, 
        createShader  (gl, gl.VERTEX_SHADER, LightingPassVertexShaderSource), 
        createShader  (gl, gl.FRAGMENT_SHADER, 
            LightingPassFragmentShaderHeaderSource +
            LightingPassFragmentShaderFooterSource));

    var TAAPassShaderProgram = createProgram(gl,
        createShader(gl, gl.VERTEX_SHADER, TAAPassVertexShaderSource),
        createShader(gl, gl.FRAGMENT_SHADER, 
            TAAPassFragmentShaderHeaderSource +
            TAAPassFragmentShaderFooterSource))

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

    // TEXTURES
    var PerlinNoiseTexture = loadTexture(gl, 'images/noise/simplex.png')
    var WhiteNoiseTexture = loadTexture(gl, 'images/noise/white.png')
    var BlueNoiseTexture = loadTexture(gl, 'images/noise/blue.png')

    var WorldTexture 

    // UNIFORMS
    var basePassTranslationLocation = gl.getUniformLocation(basePassShaderProgram, "translations")
    var basePassScaleLocation = gl.getUniformLocation(basePassShaderProgram, "scales")
    var basePassViewMatrixLocation = gl.getUniformLocation(basePassShaderProgram, "view");
    var basePassProjMatrixLocation = gl.getUniformLocation(basePassShaderProgram, "proj")
    var basePassWindowSizeLocation = gl.getUniformLocation(basePassShaderProgram, "WindowSize")
    var basePassTimeUniform = gl.getUniformLocation(basePassShaderProgram, "Time")
    var basePassColorUniform = gl.getUniformLocation(basePassShaderProgram, "Color")
    var basePassJitterUniform = gl.getUniformLocation(basePassShaderProgram, "ShouldJitter")

    var LightingPassProjectionUniform = gl.getUniformLocation(LightingPassShaderProgram, "projection")
    var LightingPassViewUniform = gl.getUniformLocation(LightingPassShaderProgram, "view");
    var LightingPassNearUniform = gl.getUniformLocation(LightingPassShaderProgram, "near")
    var LightingPassFarUniform = gl.getUniformLocation(LightingPassShaderProgram, "far")
    var LightingPassJitterUniform = gl.getUniformLocation(LightingPassShaderProgram, "ShouldJitter");
    var LightingPassPerlinNoiseSampler = gl.getUniformLocation(LightingPassShaderProgram, "PerlinNoise")
    var LightingPassWhiteNoiseSampler = gl.getUniformLocation(LightingPassShaderProgram, "WhiteNoise")
    var LightingPassBlueNoiseSampler= gl.getUniformLocation(LightingPassShaderProgram, "BlueNoise")

    var LightingPassNBoxesThisFrameUniform = gl.getUniformLocation(LightingPassShaderProgram, "NBoxesThisFrame")
    var LightingPassBoxPositions = gl.getUniformLocation(LightingPassShaderProgram, "BoxPositions")
    var LightingPassBoxColours = gl.getUniformLocation(LightingPassShaderProgram, "BoxColours")
    var LightingPassBoxSizes = gl.getUniformLocation(LightingPassShaderProgram, "BoxSizes")

    var LightingPassSpherePositions = gl.getUniformLocation(LightingPassShaderProgram, "SpherePositions")
    var LightingPassSphereColours = gl.getUniformLocation(LightingPassShaderProgram, "SphereColours")
    var LightingPassSphereSizes = gl.getUniformLocation(LightingPassShaderProgram, "SphereSizes")

    var LightingPassWorldTextureSampler = gl.getUniformLocation(LightingPassShaderProgram, "WorldTexture");

    var LightingPassAlbedoSampler = gl.getUniformLocation(LightingPassShaderProgram, "AlbedoBuffer");
    var LightingPassNormalSampler = gl.getUniformLocation(LightingPassShaderProgram, "NormalBuffer");
    var LightingPassUVSampler     = gl.getUniformLocation(LightingPassShaderProgram, "UVBuffer");
    var LightingPassTimeUniform = gl.getUniformLocation(LightingPassShaderProgram, "Time")
    var LightingPassCameraPositionUniform = gl.getUniformLocation(LightingPassShaderProgram, "CameraPosition")
    var LightingPassViewToWorldUniform = gl.getUniformLocation(LightingPassShaderProgram, "ViewToWorld");
    var LightingPassWorldToViewUniform = gl.getUniformLocation(LightingPassShaderProgram, "WorldToView")
    var LightingPassShadingModeUniform = gl.getUniformLocation(LightingPassShaderProgram, "ShadingMode")

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

    var sphereGeometryVertexArray = gl.createVertexArray();
    gl.bindVertexArray(sphereGeometryVertexArray);

    var sphereGeometryPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereGeometryPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphereGeometryPositions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    var sphereGeometryNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereGeometryNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphereGeometryNormals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    var sphereGeometryUVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereGeometryUVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sphereGeometryUVs, gl.STATIC_DRAW);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2)

    // SCENE
    var BoxPositions = []
    var BoxColours = []
    var BoxSizes = []

    var SpherePositions = []
    var SphereColours = []
    var SphereSizes = []

    var Culled = 0

    var World = [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ];

    function LoadWorld()
    {
        WorldTexture = createBitmapTexture(gl, World)
    }

    // once on startup
    function BuildScene()
    {
        /*
        let size = Math.sqrt(World.length);
        for (var x = 0; x < size; ++x)
        {
            for (var z = 0; z < size; ++z)
            {
                if (World[x * size + z] == 1)
                {
                    BoxPositions.push( x, 0.0, z )
                    BoxColours.push(Math.random(), Math.random(), Math.random())
                    BoxSizes.push( 1.0, 1.0, 1.0)
                }
            }
        }

        for (var i = 0; i < BoxPositions.length; i += 3)
        {
            BoxPositions[i + 0] -= (size - 1) / 2.0;
            BoxPositions[i + 1] -= 0;
            BoxPositions[i + 2] -= (size - 1) / 2.0;
        }

        console.log(BoxPositions)
*/
        /*
        //BoxPositions.push(0.0, 1.0, 0.0)
        //BoxColours.push(0.1, 0.1, 0.1);
        //BoxSizes.push(100.0, 1.0, 100.0)
        BoxPositions.push(0.0, -0.5, 0.0)
        BoxColours.push(0.1, 0.1, 0.1);
        BoxSizes.push(size, 0.01, size)

        SpherePositions = [
            0.0, 0.0, 2.5
        ]

        SphereColours = [
            10.0, 10.0, 10.0,
        ]

        SphereSizes = [
            0.25
        ]
*/        

        /*
        // corridor
        BoxPositions = [
            // ground
            0.0, -1.0, -6.0,
            0.0, 1.0, -6.0,
            1.0, 0.0, -6.0,
            -1.0, 0.0, -5.0,
            -5.0, -1.0, -9.0,
            -5.0, 1.0, -9.0,
            -4.0, 0.0, -10.0,
        ]

        BoxColours = [
            0.1, 0.1, 0.1,
            0.1, 0.1, 0.1,
            0.1, 0.1, 0.1,
            0.1, 0.1, 0.1,
            0.1, 0.1, 0.1,
            0.1, 0.1, 0.1,
            0.1, 0.1, 0.1,
        ]

        BoxSizes = [
            2.0, 0.1, 8.0,
            2.0, 0.1, 8.0,
            0.1, 2.0, 8.0,
            0.1, 2.0, 6.0,
            8.0, 0.1, 2.0,
            8.0, 0.1, 2.0,
            10.0, 2.0, 0.1,
        ]

        SpherePositions = [
            -2.0, -0.4, -9.0,

            0.5, -0.65, -9.0
        ]

        SphereColours = [
            10.0, 10.0, 10.0,
            10.0, 0.5, 0.001
        ]

        SphereSizes = [
            0.5,
            0.25
        ]
        */


        // Cornell Box for Debugging
        BoxPositions = [ 
            0.0, -0.2, 0.0, 
            
            0.0, -0.7, 0.0, 
            -2.0, 1.35, 0.0,  
            2.0, 1.35, 0.0,  
            0.0, 1.3, -2.0,  
            0.0, 3.4, 0.0,
            0.0, 3.35, 0.0
        ]

        BoxColours = [ 
            0.1, 0.1, 0.1,

            0.14, 0.14, 0.14, 
            0.8, 0.32, 0.32, 
            0.1, 0.8, 0.1, 
            0.1, 0.1, 0.1, 
            0.14, 0.14, 0.14,
            10.0, 10.0, 10.0
        ]
        BoxSizes = [ 
            1.0, 1.0, 1.0, 

            4.1, 0.1, 4.0, 
            0.1, 4.0, 4.0, 
            0.1, 4.0, 4.0, 
            4.1, 4.1, 0.1, 
            4.1, 0.1, 4.0 ,
            1.0, 0.01, 1.0
        ]

        SpherePositions = [
            1.0, -0.14, 1.5
        ]

        SphereColours = [
            0.05, 0.05, 0.05
        ]

        SphereSizes = [
            0.5
        ]
        return;
        
        
        /*
        // Throughput stress test
        let GridSize = 40
        var NBoxes = 0    
        for (var x = 0; x <= GridSize; ++x)
        {
            for (var z = 0; z <= GridSize; ++z)
            {
                let xPosition = -(GridSize * 0.5) + (x)
                let zPosition = -(GridSize * 0.5) + z
    
                let y = -10.0 + (sin(xPosition * 0.53423) + cos(zPosition * 0.32532))
               // let y = Level1[x][z]
               //let y = -10.0 + noise(xPosition, zPosition) * 0.5
                BoxPositions.push(
                    xPosition, 
                    y, 
                    zPosition)

                if (Math.random() > 0.99) BoxColours.push(100.0, 0.2, 100.0)
                else BoxColours.push(0.2, 0.2, 0.2)
                BoxSizes.push(1.0, 1.0, 1.0)
                NBoxes += 1;
            }
        }
        
        */
    }

    function UpdateScene()
    {
        //for (var i = 0; i < BoxPositions.length; i += 3)
        //{
        //   // BoxPositions[i + 0] = Math.floor(BoxPositions[i + 0] + WorldCenterPoint[0])
        //   // BoxPositions[i + 2] = Math.floor(BoxPositions[i + 2] + WorldCenterPoint[1])
        //    BoxPositions[i + 1] = -10.0 + Math.floor(sin(Math.floor(BoxPositions[i + 0] + CameraPosition[0]) * 0.53423) + cos(Math.floor(BoxPositions[i + 2] + CameraPosition[2]) * 0.32532))
        //}
    }

    // RASTER SCENE
    var RasterBoxPositions = []
    var RasterBoxColours = []
    var RasterBoxSizes = []

    var RasterSpherePositions = []
    var RasterSphereColours = []
    var RasterSphereSizes = []

    // once before each frame
    function BuildRasterScene()
    {
        Candidates = []
        for (var i = 0; i < BoxPositions.length; i += 3)
        {
            Candidates.push([
                BoxPositions[i + 0], BoxPositions[i + 1], BoxPositions[i + 2],
                BoxColours[i + 0], BoxColours[i + 1], BoxColours[i + 2],
                BoxSizes[i + 0], BoxSizes[i + 1], BoxSizes[i + 2],
            ])
        }

        RasterBoxPositions = []
        RasterBoxColours = []
        RasterBoxSizes = []

        for (var i = 0; i < Candidates.length; ++i)
        {
            let position = [Candidates[i][0], Candidates[i][1], Candidates[i][2]]
            let bounds = len([Candidates[i][6], Candidates[i][7], Candidates[i][8]])
            if (!halfPlaneTest(FrustumLeft,   position, bounds)) continue;
            if (!halfPlaneTest(FrustumRight,  position, bounds)) continue;
            if (!halfPlaneTest(FrustumTop,    position, bounds)) continue;
            if (!halfPlaneTest(FrustumBottom, position, bounds)) continue;
            if (!halfPlaneTest(FrustumFront,  position, bounds)) continue;
            if (!halfPlaneTest(FrustumBack,   position, bounds)) continue;
            RasterBoxPositions.push(Candidates[i][0], Candidates[i][1], Candidates[i][2])
            RasterBoxColours.push(Candidates[i][3], Candidates[i][4], Candidates[i][5])
            RasterBoxSizes.push(Candidates[i][6], Candidates[i][7], Candidates[i][8])
        }

        RasterSpherePositions = SpherePositions
        RasterSphereColours = SphereColours
        RasterSphereSizes = SphereSizes
    }

    // RAY TRACING SCENE
    var RTBoxPositions = []
    var RTBoxColours = []
    var RTBoxSizes = []

    var RTSpherePositions = []
    var RTSphereColours = []
    var RTSphereSizes = []

    function BuildRayTracingScene()
    {
        Culled = 0;
        Candidates = []
        for (var i = 0; i < BoxPositions.length; i += 3)
        {
            let position = [ BoxPositions[i + 0], BoxPositions[i + 1], BoxPositions[i + 2] ]

            let fromCamera = normalize([
                position[0] - CameraPosition[0],
                position[1] - CameraPosition[1],
                position[2] - CameraPosition[2]])

            let d = 
                fromCamera[0] * CameraForward[0] + 
                fromCamera[1] * CameraForward[1] + 
                fromCamera[2] * CameraForward[2];

            if ((BoxPositions.length / 3) > MAX_RT_PRIMITIVES)
            {
                if (d < 0.9)
                {
                    Culled += 1;
                    continue;
                }
            }
  
            Candidates.push([
                BoxPositions[i + 0], BoxPositions[i + 1], BoxPositions[i + 2],
                BoxColours[i + 0], BoxColours[i + 1], BoxColours[i + 2],
                BoxSizes[i + 0], BoxSizes[i + 1], BoxSizes[i + 2],
            ])
        }

        Candidates.sort((lhs, rhs) => {
            let ld = len(subv(vec3(lhs[0], lhs[1], lhs[2]), vec3(CameraPosition[0], CameraPosition[1], CameraPosition[2])))
            let rd = len(subv(vec3(rhs[0], rhs[1], rhs[2]), vec3(CameraPosition[0], CameraPosition[1], CameraPosition[2])))
            return ld > rd;
        });

        RTBoxPositions = []
        RTBoxColours = []
        RTBoxSizes = []

        for (var i = 0; i < Candidates.length && i < MAX_RT_PRIMITIVES; ++i)
        {
            RTBoxPositions.push(Candidates[i][0], Candidates[i][1], Candidates[i][2])
            RTBoxColours.push(Candidates[i][3], Candidates[i][4], Candidates[i][5])
            RTBoxSizes.push(Candidates[i][6], Candidates[i][7], Candidates[i][8])
        }

        RTSpherePositions = SpherePositions
        RTSphereColours = SphereColours
        RTSphereSizes = SphereSizes
    }
    
    // CAMERA
    var CameraPosition = vec4(0.0, 0.0, 0.0, 1.0)
    var CameraVelocity = vec4(0.0, 0.0, 0.0, 0.0)

    var CameraRotation = new Float32Array([0.0, 0.0, 0.0])
    var CameraAngularVelocity = new Float32Array([0.0, 0.0, 0.0])

    var LastCameraPosition = CameraPosition
    var LastCameraRotation = CameraRotation
    var ViewTransformHasChanged = true;

    var Near = 0.01
    var Far = 100.0
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

        FrustumLeft = [
            access(viewProj, 0, 3) + access(viewProj, 0, 0),
            access(viewProj, 1, 3) + access(viewProj, 1, 0),
            access(viewProj, 2, 3) + access(viewProj, 2, 0),
            access(viewProj, 3, 3) + access(viewProj, 3, 0)
        ]

        FrustumRight = [
            access(viewProj, 0, 3) - access(viewProj, 0, 0),
            access(viewProj, 1, 3) - access(viewProj, 1, 0),
            access(viewProj, 2, 3) - access(viewProj, 2, 0),
            access(viewProj, 3, 3) - access(viewProj, 3, 0)
        ]

        FrustumTop = [
            access(viewProj, 0, 3) - access(viewProj, 0, 1),
            access(viewProj, 1, 3) - access(viewProj, 1, 1),
            access(viewProj, 2, 3) - access(viewProj, 2, 1),
            access(viewProj, 3, 3) - access(viewProj, 3, 1)
        ]

        FrustumBottom = [
            access(viewProj, 0, 3) + access(viewProj, 0, 1),
            access(viewProj, 1, 3) + access(viewProj, 1, 1),
            access(viewProj, 2, 3) + access(viewProj, 2, 1),
            access(viewProj, 3, 3) + access(viewProj, 3, 1)
        ]

        FrustumFront = [
            access(viewProj, 0, 3) + access(viewProj, 0, 2),
            access(viewProj, 1, 3) + access(viewProj, 1, 2),
            access(viewProj, 2, 3) + access(viewProj, 2, 2),
            access(viewProj, 3, 3) + access(viewProj, 3, 2)
        ]

        FrustumBack = [
            access(viewProj, 0, 3) - access(viewProj, 0, 2),
            access(viewProj, 1, 3) - access(viewProj, 1, 2),
            access(viewProj, 2, 3) - access(viewProj, 2, 2),
            access(viewProj, 3, 3) - access(viewProj, 3, 2)
        ]

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

        gl.clearColor(0.01, 0.01, 0.01, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.clear(gl.DEPTH_BUFFER_BIT)
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST)
        gl.disable(gl.BLEND)
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1,gl.COLOR_ATTACHMENT2]);
        gl.useProgram(basePassShaderProgram);

        gl.uniform2fv(basePassWindowSizeLocation, [canvas.width, canvas.height])
        gl.uniform1f(basePassTimeUniform, frameID);
        gl.uniformMatrix4fv(basePassProjMatrixLocation, false, projMatrix)
        gl.uniformMatrix4fv(basePassViewMatrixLocation, false, worldToViewMatrix)
        gl.uniform1i(basePassJitterUniform, TAA.checked ? 1 : 0);

        var BoxPositionsToRasterize = [...RasterBoxPositions]
        var BoxColoursToRasterize   = [...RasterBoxColours]
        var BoxSizesToRasterize     = [...RasterBoxSizes]

        while (BoxPositionsToRasterize.length > 0)
        {
            gl.bindVertexArray(boxGeometryVertexArray);
            gl.uniform3fv(basePassTranslationLocation, BoxPositionsToRasterize);
            gl.uniform3fv(basePassScaleLocation, BoxSizesToRasterize);
            gl.uniform3fv(basePassColorUniform, BoxColoursToRasterize)
            gl.drawArraysInstanced(gl.TRIANGLES, 0, boxGeometryPositions.length / 3, BoxPositionsToRasterize.length / 3);
            BoxPositionsToRasterize.splice(0, MAX_RASTER_PRIMITIVES_PER_BATCH * 3)
            BoxColoursToRasterize.splice(0, MAX_RASTER_PRIMITIVES_PER_BATCH * 3)
        }

        
        var SpherePositionsToRasterize = [...RasterSpherePositions]
        var SphereColoursToRasterize   = [...RasterSphereColours]
        var SphereSizesToRasterize     = []

        for (var i = 0; i < RasterSphereSizes.length; ++i)
        {
            SphereSizesToRasterize.push(RasterSphereSizes[i], RasterSphereSizes[i], RasterSphereSizes[i])
        }

        gl.bindVertexArray(sphereGeometryVertexArray);
        gl.uniform3fv(basePassTranslationLocation, SpherePositionsToRasterize);
        gl.uniform3fv(basePassScaleLocation, SphereSizesToRasterize);
        gl.uniform3fv(basePassColorUniform, SphereColoursToRasterize)
        gl.drawArraysInstanced(gl.TRIANGLES, 0, sphereGeometryPositions.length / 3, SpherePositionsToRasterize.length / 3);
        SpherePositionsToRasterize.splice(0, MAX_RASTER_PRIMITIVES_PER_BATCH * 3)
        SphereColoursToRasterize.splice(0, MAX_RASTER_PRIMITIVES_PER_BATCH * 3)

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
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

        gl.activeTexture(gl.TEXTURE6)
        gl.bindTexture(gl.TEXTURE_2D, WorldTexture)
        gl.uniform1i(LightingPassWorldTextureSampler, 6);

        if (RTBoxPositions.length > 0)
        {
            gl.uniform1i(LightingPassNBoxesThisFrameUniform, RTBoxPositions.length)
            gl.uniform3fv(LightingPassBoxPositions, RTBoxPositions)
            gl.uniform3fv(LightingPassBoxColours, RTBoxColours)
            gl.uniform3fv(LightingPassBoxSizes, RTBoxSizes)
        }

        gl.uniform3fv(LightingPassSpherePositions, SpherePositions);
        gl.uniform3fv(LightingPassSphereColours, SphereColours);
        gl.uniform1fv(LightingPassSphereSizes, SphereSizes);

        gl.uniform1f(LightingPassTimeUniform, frameID);

        gl.uniform4fv(LightingPassCameraPositionUniform, CameraPosition);
        gl.uniformMatrix4fv(LightingPassViewToWorldUniform, false, (viewToWorldMatrix))
        gl.uniformMatrix4fv(LightingPassWorldToViewUniform, false, (worldToViewMatrix))

        gl.uniform1i(LightingPassShadingModeUniform, document.getElementById('shading').selectedIndex);

        gl.bindVertexArray(screenGeometryVertexArray);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.disable(gl.BLEND)
    }

    function TAAPass () 
    {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0.01, 0.01, 0.01, 0);
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
       // gl.bindTexture(gl.TEXTURE_2D, LightingBuffers[0])
       // gl.copyTexImage2D(
       //     gl.TEXTURE_2D, 
       //     0,
       //     gl.RGBA, 
       //     0, 0,
       //     canvas.width,
       //     canvas.height,
       //     0);
        
    }

    function Render () 
    {
        BasePass();
        LightingPass();
        if (TAA.checked) TAAPass();
        frameID++;
    }

    var then = 0
    var FramerateTickInterval = 10;
    var DisplayedFrameTime = 0.0;
    var hideUI = false;
    var frameID = 1;

    function Loop (now) 
    {
        let TimeSinceLastUpdate = now - then;
        then = now

        PollInput();
        DoMovement();

        if (ImagesLoaded.every(v => v))
        {
            document.getElementById("loading").style.opacity = "0.0"
            ComputeView();

            UpdateScene();
            BuildRasterScene();
            BuildRayTracingScene();

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

        ui.innerHTML +="<p>" + BoxPositions.length / 3 + " boxes in scene </p>";
        ui.innerHTML +="<p>" + RasterBoxPositions.length / 3 + " boxes sent to raster </p>";
        ui.innerHTML +="<p>" + RTBoxPositions.length / 3 + " boxes in ray tracing </p>";
        ui.innerHTML +="<p>" + Culled + " culled with dot </p>";

        size.innerHTML = "<p>" + canvas.width + " x " + canvas.height + "</p>"
        size.innerHTML += "<p>" + canvas.clientWidth + " x " + canvas.clientHeight + "</p>"
        size.innerHTML += "<p>" + DisplayedFrameTime + "ms" + "</p>" 

        LastLoopEnded = Date.now();
        if (frameID % FramerateTickInterval == 0)
        {
            DisplayedFrameTime = TimeSinceLastUpdate;
        }
       
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

    function PollInput() 
    {
        var speed = 0.25
        var maxVelocity = 1.0
        var minVelocity = 0.01

        if (DPressed) CameraVelocity = addv(CameraVelocity, multiplys(CameraRight,  speed))
        if (APressed) CameraVelocity = addv(CameraVelocity, multiplys(CameraRight, -speed))
        if (WPressed) CameraVelocity = addv(CameraVelocity, multiplys(CameraForward, speed))
        if (SPressed) CameraVelocity = addv(CameraVelocity, multiplys(CameraForward, -speed))
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
        /*
        b = Math.sin(frameID * 0.1) + 1.0;
        BoxColours[6] = Math.sin((frameID + 65324) * 0.1) + 1.0;;
        BoxColours[7] = Math.sin((frameID + 123) * 0.1) + 1.0;;
        BoxColours[8] = Math.sin((frameID + 1) * 0.1) + 1.0;;
        */
        CameraPosition = addv(CameraPosition, CameraVelocity)
        CameraVelocity = multiplys(CameraVelocity, 0.9)

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
            else if (event.key == 'q') QPressed = !QPressed
            else if (event.key == 'e') EPressed = !EPressed
            else if (event.key == 'ArrowLeft')  LeftArrowPressed  = !LeftArrowPressed
            else if (event.key == 'ArrowRight') RightArrowPressed = !RightArrowPressed
            else if (event.key == 'ArrowUp')    UpArrowPressed    = !UpArrowPressed
            else if (event.key == 'ArrowDown')  DownArrowPressed  = !DownArrowPressed
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
            CameraRotation = new Float32Array([0.0, 0.0, 0.0]);
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
    
    LoadWorld()
    BuildScene()
    requestAnimationFrame(Loop);
}())