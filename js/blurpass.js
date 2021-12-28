class BlurPass
{
    constructor(context, width, height)
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
            uniform sampler2D InputTexture;
            uniform float OffsetScale;
            uniform int Horizontal;
            float weight[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
            in vec2 frag_uvs;
            out vec4 out_colour;
            void main()
            {
                vec2 offset = (1.0 / vec2(textureSize(InputTexture, 0))) * OffsetScale;
                vec3 result = texture(InputTexture, frag_uvs).rgb * weight[0];
                if (Horizontal == 0)
                {
                    for (int i = 1; i < 5; ++i)
                    {
                        result += texture(InputTexture, frag_uvs + vec2(offset.x * float(i), 0.0)).rgb * weight[i];
                        result += texture(InputTexture, frag_uvs - vec2(offset.x * float(i), 0.0)).rgb * weight[i];
                    }
                }
                else
                {
                    for (int i = 1; i < 5; ++i)
                    {
                        result += texture(InputTexture, frag_uvs + vec2(0.0, offset.y * float(i))).rgb * weight[i];
                        result += texture(InputTexture, frag_uvs - vec2(0.0, offset.y * float(i))).rgb * weight[i];
                    }
                }
                out_colour = vec4(result, 1.0);
            }`

        this.ShaderProgram = createProgram(this.gl,
            createShader(this.gl, this.gl.VERTEX_SHADER,   this.VertexShaderSource),
            createShader(this.gl, this.gl.FRAGMENT_SHADER, this.FragmentShaderSource))

        this.InputTextureUniformLocation = this.gl.getUniformLocation(this.ShaderProgram, "InputTexture")
        this.OffsetScaleUniformLocation  = this.gl.getUniformLocation(this.ShaderProgram, "OffsetScale")
        this.HorizontalUniformLocation   = this.gl.getUniformLocation(this.ShaderProgram, "Horizontal")

        this.width = width
        this.height = height
        this.intermediate = createColourTexture(this.gl, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE)
        this.output = createColourTexture(this.gl, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE)
    }

    Render(mesh, inTexture, amount)
    {
        let intermediateFramebuffer = createFramebuffer(this.gl, this.intermediate)
        let outputFramebuffer = createFramebuffer(this.gl, this.output)

        this.gl.viewport(0, 0, this.width, this.height);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, intermediateFramebuffer);

        this.gl.useProgram(this.ShaderProgram)

        this.gl.clearColor(0.0, 0.0, 0.0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);   
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inTexture);
        this.gl.uniform1i(this.InputTextureUniformLocation, 0);
        this.gl.uniform1f(this.OffsetScaleUniformLocation, amount);
        this.gl.uniform1i(this.HorizontalUniformLocation, 0);
        this.gl.bindVertexArray(mesh);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, outputFramebuffer);

        this.gl.clearColor(0.0, 0.0, 0.0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);   
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.intermediate);
        this.gl.uniform1i(this.InputTextureUniformLocation, 0);
        this.gl.uniform1f(this.OffsetScaleUniformLocation, amount);
        this.gl.uniform1i(this.HorizontalUniformLocation, 1);
        this.gl.bindVertexArray(mesh);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}
/*
var BlurPassVertexShaderSource = `#version 300 es
    precision lowp float;
    in vec4 vertex_position;
    in vec2 vertex_uvs;
    out vec2 frag_uvs;
    void main() 
    {
        gl_Position = vertex_position;
        frag_uvs = vertex_uvs;
    }`

var BlurPassFragmentShaderSource = `#version 300 es
    precision lowp float;
    uniform sampler2D FrameTexture;
    uniform float offsetScale;
    uniform int horizontal;
    float weight[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);


    in vec2 frag_uvs;

    out vec4 out_colour;

    void main()
    {
        vec2 offset = (1.0 / vec2(textureSize(FrameTexture, 0))) * offsetScale;
        vec3 result = texture(FrameTexture, frag_uvs).rgb * weight[0];
        if (horizontal == 0)
        {
            for (int i = 1; i < 5; ++i)
            {
                result += texture(FrameTexture, frag_uvs + vec2(offset.x * float(i), 0.0)).rgb * weight[i];
                result += texture(FrameTexture, frag_uvs - vec2(offset.x * float(i), 0.0)).rgb * weight[i];
            }
        }
        else
        {
            for (int i = 1; i < 5; ++i)
            {
                result += texture(FrameTexture, frag_uvs + vec2(0.0, offset.y * float(i))).rgb * weight[i];
                result += texture(FrameTexture, frag_uvs - vec2(0.0, offset.y * float(i))).rgb * weight[i];
            }
        }

        out_colour = vec4(result, 1.0);

    }
`
*/