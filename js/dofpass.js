class DepthOfFieldPass 
{
    VertexShaderSource = 
       `#version 300 es
        precision lowp float;
        in vec4 vertex_position;
        in vec2 vertex_uvs;
        out vec2 frag_uvs;
        void main() 
        {
            gl_Position = vertex_position;
            frag_uvs = vertex_uvs;
        }`

    FragmentShaderSource =
       `#version 300 es
        precision lowp float;

        uniform sampler2D BlurredScene;
        uniform sampler2D UnblurredScene;
        uniform sampler2D WorldPositionBuffer;

        in vec2 frag_uvs;

        out vec4 out_colour;

        void main ()
        {
            vec4 BlurSample = texture(BlurredScene, frag_uvs);
            vec4 UnblurredSample = texture(UnblurredScene, frag_uvs);
            vec4 WorldPosition = texture(WorldPositionBuffer, frag_uvs);
            vec4 FocalPoint = texture(WorldPositionBuffer, vec2(0.5, 0.5));

            float min = 0.0;
            float max = 2.0;
            float focus = distance(WorldPosition.xyz, FocalPoint.xyz) * 0.01;

            if (distance(frag_uvs, vec2(0.5, 0.5)) < 0.002)
            {
                out_colour = vec4(1.0, 1.0, 1.0, 1.0);
            }
            else 
            {
                out_colour = mix(UnblurredSample, BlurSample, clamp(0.0, 1.0, focus));
            }
        }`

    constructor (context, width, height)
    {
        this.gl = context

        this.ShaderProgram = createProgram(this.gl,
            createShader(this.gl, this.gl.VERTEX_SHADER,   this.VertexShaderSource),
            createShader(this.gl, this.gl.FRAGMENT_SHADER, this.FragmentShaderSource))

        this.BlurredSceneUniformLocation        = this.gl.getUniformLocation(this.ShaderProgram, "BlurredScene")
        this.UnblurredSceneUniformLocation      = this.gl.getUniformLocation(this.ShaderProgram, "UnblurredScene")
        this.WorldPositionBufferUniformLocation = this.gl.getUniformLocation(this.ShaderProgram, "WorldPositionBuffer")

        this.width = width
        this.height = height
        this.output = createColourTexture(this.gl, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE)
    }

    Render(mesh, inSceneTexture, inBlurredSceneTexture, inPositionTexture, toScreen)
    {
        if (toScreen)
        {
            this.gl.viewport(0, 0, this.width, this.height);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
        else
        {
            let framebuffer = createFramebuffer(this.gl, this.output)
            this.gl.viewport(0, 0, this.width, this.height);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
        }

        this.gl.clearColor(0.0, 0.0, 0.0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.ShaderProgram);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inSceneTexture);
        this.gl.uniform1i(this.UnblurredSceneUniformLocation, 0);
        
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inBlurredSceneTexture);
        this.gl.uniform1i(this.BlurredSceneUniformLocation, 1);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inPositionTexture);
        this.gl.uniform1i(this.WorldPositionBufferUniformLocation, 2);
        
        this.gl.bindVertexArray(mesh);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6); 
    }
}

/*
var DoFVertexShaderSource = 

var DoFFragmentShaderSource = `#version 300 es
    precision lowp float;

    uniform sampler2D BlurredScene;
    uniform sampler2D UnblurredScene;
    uniform sampler2D WorldPositionBuffer;

    in vec2 frag_uvs;

    out vec4 out_colour;

    void main ()
    {
        vec4 BlurSample = texture(BlurredScene, frag_uvs);
        vec4 UnblurredSample = texture(UnblurredScene, frag_uvs);
        vec4 WorldPosition = texture(WorldPositionBuffer, frag_uvs);
        vec4 FocalPoint = texture(WorldPositionBuffer, vec2(0.5, 0.5));

        float min = 0.0;
        float max = 2.0;
        float focus = distance(WorldPosition.xyz, FocalPoint.xyz) * 0.01;

        if (distance(frag_uvs, vec2(0.5, 0.5)) < 0.002)
        {
            out_colour = vec4(1.0, 1.0, 1.0, 1.0);
        }
        else 
        {
            out_colour = mix(UnblurredSample, BlurSample, clamp(0.0, 1.0, focus));
        }
    }`
    */