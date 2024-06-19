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
        
            #define NFrames 15
        
            uniform sampler2D WorldPositionBuffer;
            uniform sampler2D Frames[NFrames];
            uniform mat4      View0;
            uniform mat4      View1;
            uniform mat4      View2;
            uniform mat4      View3;
            uniform mat4      View4;
            uniform mat4      View5;
            uniform mat4      View6;
            uniform mat4      View7;
            uniform mat4      View8;
            uniform mat4      View9;
            uniform mat4      View10;
            uniform mat4      View11; 
            uniform mat4      View12;
            uniform mat4      View13;
            uniform mat4      View14;
                    
            uniform vec2 WindowSize;

            in vec2 frag_uvs;
        
            layout (location = 0) out vec4 out_color;
            layout (location = 1) out vec4 out_bloom;
        
            void main() 
            {
                vec4 Result = vec4(0.0, 0.0, 0.0, 1.0);

                vec4 NeighbourMin = vec4(1.0);
                vec4 NeighbourMax = vec4(0.0);

                ivec2 frag_uvs_int = ivec2(frag_uvs * WindowSize);

                vec4 Neighbour0 = texelFetch(Frames[0], frag_uvs_int + ivec2(0, 1), 0);
                NeighbourMin = min(NeighbourMin, Neighbour0);
                NeighbourMax = max(NeighbourMax, Neighbour0);

                vec4 Neighbour1 = texelFetch(Frames[0], frag_uvs_int + ivec2(0, -1), 0);
                NeighbourMin = min(NeighbourMin, Neighbour1);
                NeighbourMax = max(NeighbourMax, Neighbour1);

                vec4 Neighbour2 = texelFetch(Frames[0], frag_uvs_int + ivec2(1, 0), 0);
                NeighbourMin = min(NeighbourMin, Neighbour2);
                NeighbourMax = max(NeighbourMax, Neighbour2);

                vec4 Neighbour3 = texelFetch(Frames[0], frag_uvs_int + ivec2(-1, 0), 0);
                NeighbourMin = min(NeighbourMin, Neighbour3);
                NeighbourMax = max(NeighbourMax, Neighbour3);
                
                // NeighbourMin = vec4(0.0);
                // NeighbourMax = vec4(1.0);

                vec4 position = texture(WorldPositionBuffer, frag_uvs);
                position.w = 1.0;

                vec4 pl = position;
                vec2 uv = frag_uvs;
                Result += (texture(Frames[0], uv)); // ??
  
                pl = View1 * position;
                uv = (0.5 * (pl.xy / pl.w) + 0.5);
                Result += clamp(texture(Frames[1], uv), NeighbourMin, NeighbourMax);

                pl = View2 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[2], uv), NeighbourMin, NeighbourMax);

                pl = View3 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[3], uv), NeighbourMin, NeighbourMax);

                pl = View4 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[4], uv), NeighbourMin, NeighbourMax);

                pl = View5 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[5], uv), NeighbourMin, NeighbourMax);

                pl = View6 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[6], uv), NeighbourMin, NeighbourMax);

                pl = View7 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[7], uv), NeighbourMin, NeighbourMax);

                pl = View8 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[8], uv), NeighbourMin, NeighbourMax);

                pl = View9 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[9], uv), NeighbourMin, NeighbourMax);

                pl = View10 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[10], uv), NeighbourMin, NeighbourMax);

                pl = View11 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[11], uv), NeighbourMin, NeighbourMax);

                pl = View12 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[12], uv), NeighbourMin, NeighbourMax);

                pl = View13 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[13], uv), NeighbourMin, NeighbourMax);

                pl = View14 * position;
                uv = (0.5 * (pl.xy/ pl.w) + 0.5);
                Result += clamp(texture(Frames[14], uv), NeighbourMin, NeighbourMax);

                out_color = vec4(Result.xyz * 0.0666, 1.0);
        
                if (out_color.x > 0.9 || out_color.y > 0.9 || out_color.z > 0.9)
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
        this.View8UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View8");
        this.View9UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View9");
        this.View10UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View10");
        this.View11UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View11");
        this.View12UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View12");
        this.View13UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View13");
        this.View14UniformLocation                = this.gl.getUniformLocation(this.ShaderProgram, "View14");
        this.WindowSizeUniformLocation            = this.gl.getUniformLocation(this.ShaderProgram, "WindowSize");

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

        this.gl.clearColor(0.03, 0.03, 0.03, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.useProgram(this.ShaderProgram);

        this.gl.uniform1i(this.WorldPositionBufferUniformLocation, 0)        
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inWorldPositionBuffers[0]);

        this.gl.uniform1iv(this.FramesUniformLocation, [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ])
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[0]);
        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[1]);
        this.gl.activeTexture(this.gl.TEXTURE3);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[2]);
        this.gl.activeTexture(this.gl.TEXTURE4);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[3]);
        this.gl.activeTexture(this.gl.TEXTURE5);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[4]);
        this.gl.activeTexture(this.gl.TEXTURE6);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[5]);
        this.gl.activeTexture(this.gl.TEXTURE7);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[6]);
        this.gl.activeTexture(this.gl.TEXTURE8);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[7]);

        this.gl.activeTexture(this.gl.TEXTURE9);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[8]);
        this.gl.activeTexture(this.gl.TEXTURE10);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[9]);
        this.gl.activeTexture(this.gl.TEXTURE11);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[10]);
        this.gl.activeTexture(this.gl.TEXTURE12);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[11]);
        this.gl.activeTexture(this.gl.TEXTURE13);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[12]);
        this.gl.activeTexture(this.gl.TEXTURE14);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[13]);
        this.gl.activeTexture(this.gl.TEXTURE15);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[14]);
        this.gl.activeTexture(this.gl.TEXTURE16);
        this.gl.bindTexture(this.gl.TEXTURE_2D, inLightingBuffers[15]);

        this.gl.uniform2fv(this.WindowSizeUniformLocation, [this.width, this.height])

        this.gl.uniformMatrix4fv(this.View0UniformLocation,  false, Views[0])
        this.gl.uniformMatrix4fv(this.View1UniformLocation,  false, Views[1])
        this.gl.uniformMatrix4fv(this.View2UniformLocation,  false, Views[2])
        this.gl.uniformMatrix4fv(this.View3UniformLocation,  false, Views[3])
        this.gl.uniformMatrix4fv(this.View4UniformLocation,  false, Views[4])
        this.gl.uniformMatrix4fv(this.View5UniformLocation,  false, Views[5])
        this.gl.uniformMatrix4fv(this.View6UniformLocation,  false, Views[6])
        this.gl.uniformMatrix4fv(this.View7UniformLocation,  false, Views[7])

        this.gl.uniformMatrix4fv(this.View8UniformLocation,  false, Views[8])
        this.gl.uniformMatrix4fv(this.View9UniformLocation,  false, Views[9])
        this.gl.uniformMatrix4fv(this.View10UniformLocation,  false, Views[10])
        this.gl.uniformMatrix4fv(this.View11UniformLocation,  false, Views[11])
        this.gl.uniformMatrix4fv(this.View12UniformLocation,  false, Views[12])
        this.gl.uniformMatrix4fv(this.View13UniformLocation,  false, Views[13])
        this.gl.uniformMatrix4fv(this.View14UniformLocation,  false, Views[14])
        

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