class BloomPass 
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
    
            out_colour = clamp(vec4(0.0), vec4(1.0), BlurSample + UnblurredSample);
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

    Render (mesh, inSceneTexture, inBloomTexture, inPositionTexture, toScreen)
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
        this.gl.bindTexture(this.gl.TEXTURE_2D, inBloomTexture);
        this.gl.uniform1i(this.BlurredSceneUniformLocation, 1);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inPositionTexture);
        this.gl.uniform1i(this.WorldPositionBufferUniformLocation, 2);
        
        this.gl.bindVertexArray(mesh);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6); 
    }
}