class FogPass 
{
    constructor (context, width, height)
    {
        this.gl = context

        this.VertexShaderSource = 
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
 
        this.FragmentShaderSource = 
            `#version 300 es
            precision lowp float;
            uniform sampler2D SceneTexture;
            uniform sampler2D PositionTexture;
            #define FOG_COLOUR vec4(0.3, 0.3, 0.3, 1.0)
            #define FOG_DISTANCE 60.0
            in vec2 frag_uvs;
            out vec4 out_colour;
            void main()
            {
                vec4 Scene = texture(SceneTexture, frag_uvs);
                float t = texture(PositionTexture, frag_uvs).w;
                float f = clamp(0.0, FOG_DISTANCE, t) / FOG_DISTANCE;
                out_colour = mix(Scene, FOG_COLOUR, min(f, 0.96));
            }`

        this.ShaderProgram = createProgram(this.gl,
            createShader(this.gl, this.gl.VERTEX_SHADER,   this.VertexShaderSource),
            createShader(this.gl, this.gl.FRAGMENT_SHADER, this.FragmentShaderSource))

        this.SceneTextureUniformLocation    = this.gl.getUniformLocation(this.ShaderProgram, "SceneTexture")
        this.PositionTextureUniformLocation = this.gl.getUniformLocation(this.ShaderProgram, "PositionTexture")

        this.width = width
        this.height = height
        this.output = createColourTexture(this.gl, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE)
    }

    Render (mesh, inSceneTexture, inPositionTexture, toScreen)
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
        this.gl.uniform1i(this.SceneTextureUniformLocation, 0);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inPositionTexture);
        this.gl.uniform1i(this.PositionTextureUniformLocation, 1);
        this.gl.bindVertexArray(mesh);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);  
    }
}