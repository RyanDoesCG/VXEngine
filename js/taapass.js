class TAAPass
{
    constructor (context, width, height)
    {
        this.gl = context

        this.VertexShaderSource = 
           `#version 300 es
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
        
            #define NFrames 5
        
            uniform sampler2D WorldPositionBuffer;
            uniform sampler2D Frames[NFrames];
            uniform mat4      View0;
            uniform mat4      View1;
            uniform mat4      View2;
            uniform mat4      View3;
            uniform mat4      View4;

            in vec2 frag_uvs;
        
            layout (location = 0) out vec4 out_color;
            layout (location = 1) out vec4 out_bloom;
        
            bool shouldRejectSample (vec2 uv)
            {
                bool inRange = uv.x < 1.0 && uv.x > 0.0 && uv.y < 1.0 && uv.y > 0.0;
                bool farFromCurrentPixel = length(uv - frag_uvs) > 0.05;
                return !inRange || farFromCurrentPixel;
            }
        
            void main() 
            {
                vec4 Result = vec4(0.0, 0.0, 0.0, 1.0);
        
                vec4 position = texture(WorldPositionBuffer, frag_uvs);
                position.w = 1.0;
   
                const float MaxWeight = 1.0;
                const float MinWeight = 0.25;
        
                float weight = 1.0;
                float samples = 0.0;
        
                vec4 pl = position;
                vec2 uv = frag_uvs;
                Result += texture(Frames[0], uv) * weight;
                samples += 1.0;
        
                pl = View1 * position;
                uv = (0.5 * (pl.xy / pl.w) + 0.5);
                if (!shouldRejectSample(uv))
                {
                    Result += texture(Frames[1],  uv) * weight;
                    samples += 1.0;
                }
        
                pl = View2 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                if (!shouldRejectSample(uv))
                {
                    Result += texture(Frames[2],  uv) * weight;
                    samples += 1.0;
                }
        
                pl = View3 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                if (!shouldRejectSample(uv))
                {
                    Result += texture(Frames[3],  uv) * weight;
                    samples += 1.0;
                }
        
                pl = View4 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                if (!shouldRejectSample(uv))
                {
                    Result += texture(Frames[4],  uv) * weight;
                    samples += 1.0;
                }
        
                out_color = vec4(Result.xyz / samples, 1.0);
        
                if (out_color.x > 0.5 || out_color.y > 0.5 || out_color.z > 0.5)
                {
                    out_bloom = out_color;
                }
            }`

        this.ShaderProgram = createProgram(this.gl,
            createShader(this.gl, this.gl.VERTEX_SHADER,   this.VertexShaderSource),
            createShader(this.gl, this.gl.FRAGMENT_SHADER, this.FragmentShaderSource))

        this.WorldPositionBufferUniformLocation  = this.gl.getUniformLocation(this.ShaderProgram, "WorldPositionBuffer");
        this.FramesUniformLocation               = this.gl.getUniformLocation(this.ShaderProgram, "Frames");
        this.View0UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View0");
        this.View1UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View1");
        this.View2UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View2");
        this.View3UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View3");
        this.View4UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View4");

        this.width = width
        this.height = height
        this.outputColour = createColourTexture(this.gl, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE)
        this.outputBloom  = createColourTexture(this.gl, this.width, this.height, this.gl.RGBA32F, this.gl.FLOAT)
    }

    Render(mesh, inLightingBuffers, inWorldPositionBuffers, Views, toScreen)
    {
        if (toScreen)
        {
            this.gl.viewport(0, 0, this.width, this.height);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
        else
        {
            let framebuffer = createFramebuffer(this.gl, this.outputColour, this.outputBloom)
            this.gl.viewport(0, 0, this.width, this.height);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
            this.gl.drawBuffers([
                this.gl.COLOR_ATTACHMENT0, 
                this.gl.COLOR_ATTACHMENT1]);
        }

        this.gl.clearColor(0.0, 0.0, 0.0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.ShaderProgram);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inWorldPositionBuffers);
        this.gl.uniform1i(this.WorldPositionBufferUniformLocation, 0);
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[0]);
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[1]);
        this.gl.activeTexture(this.gl.TEXTURE4);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[2]);
        this.gl.activeTexture(this.gl.TEXTURE5);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[3]);
        this.gl.activeTexture(this.gl.TEXTURE6);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[4]);

        this.gl.uniform1iv(this.FramesUniformLocation, [ 2, 3, 4, 5, 6 ])

        this.gl.uniformMatrix4fv(this.View0UniformLocation,  false, Views[0])
        this.gl.uniformMatrix4fv(this.View1UniformLocation,  false, Views[1])
        this.gl.uniformMatrix4fv(this.View2UniformLocation,  false, Views[2])
        this.gl.uniformMatrix4fv(this.View3UniformLocation,  false, Views[3])
        this.gl.uniformMatrix4fv(this.View4UniformLocation,  false, Views[4])

        this.gl.bindVertexArray(mesh);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

        // Using the anti-aliased image as the history sample
        // much better quality, bad ghosting
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[0])
        this.gl.copyTexImage2D(
            this.gl.TEXTURE_2D, 
            0,
            this.gl.RGBA, 
            0, 0,
            this.Width,
            this.Height,
            0);
    }
}