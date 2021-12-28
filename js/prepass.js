class BackfacePrePass
{
    VertexShaderSource = 
       `#version 300 es

        precision lowp float;
        precision lowp int;

        uniform mat4 proj;
        uniform mat4 view;
        uniform mat4 transform;

        uniform float Time;
        uniform vec2 WindowSize;
        uniform int ShouldJitter;

        uniform sampler2D WhiteNoise;

        in vec3 vertex_position;
        in vec3 vertex_normal;
        in vec2 vertex_uv;

        out vec4 frag_worldpos;

        float random(vec2 uv)
        {
            return texture(WhiteNoise, uv).r;
        }

        void main() 
        {
            float x = random(vec2(Time, 0.0) * 0.2) * 1.0;
            float y = random(vec2(0.0, Time) * 0.2) * 1.0;

            mat4 jitter_proj = proj;
            if (ShouldJitter == 1)
            {
                jitter_proj[2][0] = (x * 2.0 - 1.0) / WindowSize.x;
                jitter_proj[2][1] = (y * 2.0 - 1.0) / WindowSize.y;
            }

            frag_worldpos = transform * vec4(vertex_position, 1.0);
            gl_Position = jitter_proj * view * frag_worldpos;
        }`

    FragmentShaderSource = 
       `#version 300 es
        precision lowp float;
        uniform vec4 CameraPosition;
        in vec4 frag_worldpos;
        layout(location = 0) out vec4 out_color;
        void main ()
        {
            out_color = vec4(
                distance(CameraPosition.xyz, frag_worldpos.xyz),
                0.0,
                0.0,
                1.0);
        }`

    constructor(context, width, height)
    {
        this.gl = context

        this.ShaderProgram = createProgram(this.gl,
            createShader(this.gl, this.gl.VERTEX_SHADER,   this.VertexShaderSource),
            createShader(this.gl, this.gl.FRAGMENT_SHADER, this.FragmentShaderSource))

        this.ProjectionMatrixUniformLocation = this.gl.getUniformLocation(this.ShaderProgram, "proj")
        this.ViewMatrixUniformLocation       = this.gl.getUniformLocation(this.ShaderProgram, "view")
        this.TransformMatrixUniformLocation  = this.gl.getUniformLocation(this.ShaderProgram, "transform")
        this.TimeUniformLocation             = this.gl.getUniformLocation(this.ShaderProgram, "Time")
        this.WindowSizeUniformLocation       = this.gl.getUniformLocation(this.ShaderProgram, "WindowSize")
        this.ShouldJitterUniformLocation     = this.gl.getUniformLocation(this.ShaderProgram, "ShouldJitter")
        this.WhiteNoiseUniformLocation       = this.gl.getUniformLocation(this.ShaderProgram, "WhiteNoise")
        this.CameraPositionUniformLocation   = this.gl.getUniformLocation(this.ShaderProgram, "CameraPosition")

        this.width = width
        this.height = height
        this.output = createColourTexture(this.gl, this.width, this.height, this.gl.RGBA32F, this.gl.FLOAT)
        this.framebuffer = createFramebuffer(this.gl, this.output)
    }

    Render(mesh, meshSize, View, Transform, Time, WindowSize, ShouldJitter, WhiteNoise, CameraPosition)
    {
        this.gl.viewport(0, 0, this.width, this.height)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer)
        this.gl.useProgram(this.ShaderProgram)
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0)
        this.gl.clear(this.gl.COLOR_BUFFER_BIT)
        this.gl.clear(this.gl.DEPTH_BUFFER_BIT)

        this.gl.enable(this.gl.CULL_FACE)
        this.gl.cullFace(this.gl.FRONT)

        this.gl.uniformMatrix4fv(this.ProjectionMatrixLocation, false, View.ProjectionMatrix)
        this.gl.uniformMatrix4fv(this.ViewMatrixLocation, false, View.WorldToViewMatrix)
        this.gl.uniformMatrix4fv(this.TransformMatrixLocation, false, Transform)
        this.gl.uniform1f(this.TimeUniformLocation, Time)
        this.gl.uniform2fv(this.WindowSizeUniformLocation, WindowSize)          
        this.gl.uniform1i(this.ShouldJitterUniformLocation, ShouldJitter);
        this.gl.uniform4fv(this.CameraPositionUniformLocation, CameraPosition)

        this.gl.uniform1i(this.WhiteNoiseUniformLocation, 0);
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, WhiteNoise);
        
        this.gl.bindVertexArray(mesh);

        this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, meshSize, 1);
        
        this.gl.disable(this.gl.CULL_FACE)
    }
}