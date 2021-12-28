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
        
            #define NFrames 8
        
            uniform sampler2D WorldPositionBuffer[NFrames];
            uniform sampler2D Frames[NFrames];
            uniform mat4      View0;
            uniform mat4      View1;
            uniform mat4      View2;
            uniform mat4      View3;
            uniform mat4      View4;
            uniform mat4      View5;
            uniform mat4      View6;
            uniform mat4      View7;

            in vec2 frag_uvs;
        
            layout (location = 0) out vec4 out_color;
            layout (location = 1) out vec4 out_bloom;
        
            bool shouldRejectSample (vec2 uv, vec3 thispos, vec3 thatpos)
            {
                bool inRange = uv.x < 1.0 && uv.x > 0.0 && uv.y < 1.0 && uv.y > 0.0;
                bool farFromCurrentPixel = length(thispos - thatpos) > 0.1;
                return !inRange || farFromCurrentPixel;
            }
        
            void main() 
            {
                vec4 Result = vec4(0.0, 0.0, 0.0, 1.0);
        
                vec4 position = texture(WorldPositionBuffer[0], frag_uvs);
                position.w = 1.0;
   
                float samples = 0.0;
        
                vec4 pl = position;
                vec2 uv = frag_uvs;
                vec3 otherpos;
                Result += texture(Frames[0], uv);
                samples += 1.0;
        
                pl = View1 * position;
                uv = (0.5 * (pl.xy / pl.w) + 0.5);
                otherpos = texture(WorldPositionBuffer[1], uv).xyz;
                if (!shouldRejectSample(uv, position.xyz, otherpos.xyz))
                {
                    Result += texture(Frames[1],  uv);
                    samples += 1.0;
                }
        
                pl = View2 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                otherpos = texture(WorldPositionBuffer[2], uv).xyz;
                if (!shouldRejectSample(uv, position.xyz, otherpos.xyz))
                {
                    Result += texture(Frames[2],  uv);
                    samples += 1.0;
                }
        
                pl = View3 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                otherpos = texture(WorldPositionBuffer[3], uv).xyz;
                if (!shouldRejectSample(uv, position.xyz, otherpos.xyz))
                {
                    Result += texture(Frames[3],  uv);
                    samples += 1.0;
                }
        
                pl = View4 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                otherpos = texture(WorldPositionBuffer[4], uv).xyz;
                if (!shouldRejectSample(uv, position.xyz, otherpos.xyz))
                {
                    Result += texture(Frames[4],  uv);
                    samples += 1.0;
                }

                pl = View5 * position;
                uv = (0.5 * (pl.xy / pl.w) + 0.5);
                otherpos = texture(WorldPositionBuffer[5], uv).xyz;
                if (!shouldRejectSample(uv, position.xyz, otherpos.xyz))
                {
                    Result += texture(Frames[5],  uv);
                    samples += 1.0;
                }
        
                pl = View6 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                otherpos = texture(WorldPositionBuffer[6], uv).xyz;
                if (!shouldRejectSample(uv, position.xyz, otherpos.xyz))
                {
                    Result += texture(Frames[6],  uv);
                    samples += 1.0;
                }
        
                pl = View7 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                otherpos = texture(WorldPositionBuffer[7], uv).xyz;
                if (!shouldRejectSample(uv, position.xyz, otherpos.xyz))
                {
                    Result += texture(Frames[7],  uv);
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
        this.View5UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View5");
        this.View6UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View6");
        this.View7UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View7");

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
        this.gl.bindTexture(this.gl.TEXTURE_2D, inWorldPositionBuffers[0]);
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inWorldPositionBuffers[1]);
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inWorldPositionBuffers[2]);
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inWorldPositionBuffers[3]);
        this.gl.activeTexture(this.gl.TEXTURE4);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inWorldPositionBuffers[4]);
        this.gl.activeTexture(this.gl.TEXTURE5);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inWorldPositionBuffers[5]);
        this.gl.activeTexture(this.gl.TEXTURE6);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inWorldPositionBuffers[6]);
        this.gl.activeTexture(this.gl.TEXTURE7);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inWorldPositionBuffers[7]);

        this.gl.activeTexture(this.gl.TEXTURE8);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[0]);
        this.gl.activeTexture(this.gl.TEXTURE9);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[1]);
        this.gl.activeTexture(this.gl.TEXTURE10);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[2]);
        this.gl.activeTexture(this.gl.TEXTURE11);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[3]);
        this.gl.activeTexture(this.gl.TEXTURE12);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[4]);
        this.gl.activeTexture(this.gl.TEXTURE13);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[5]);
        this.gl.activeTexture(this.gl.TEXTURE14);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[6]);
        this.gl.activeTexture(this.gl.TEXTURE15);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[7]);

        this.gl.uniform1iv(this.WorldPositionBufferUniformLocation, [ 0, 1, 2, 3, 4, 5, 6, 7 ])
        this.gl.uniform1iv(this.FramesUniformLocation, [ 8, 9, 10, 11, 12, 13, 14, 15])

        this.gl.uniformMatrix4fv(this.View0UniformLocation,  false, Views[0])
        this.gl.uniformMatrix4fv(this.View1UniformLocation,  false, Views[1])
        this.gl.uniformMatrix4fv(this.View2UniformLocation,  false, Views[2])
        this.gl.uniformMatrix4fv(this.View3UniformLocation,  false, Views[3])
        this.gl.uniformMatrix4fv(this.View4UniformLocation,  false, Views[4])
        this.gl.uniformMatrix4fv(this.View5UniformLocation,  false, Views[5])
        this.gl.uniformMatrix4fv(this.View6UniformLocation,  false, Views[6])
        this.gl.uniformMatrix4fv(this.View7UniformLocation,  false, Views[7])
        

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
            this.width,
            this.height,
            0);
    }
}