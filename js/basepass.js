var basePassVertexShaderSource = 
    `#version 300 es

    #define NUM_BOXES *MAX_RASTER_PRIMITIVES_PER_BATCH*

    uniform mat4 proj;
    uniform mat4 view;
    uniform vec3 translations[NUM_BOXES];
    uniform vec3 scales[NUM_BOXES];

    uniform float Time;
    uniform vec2 WindowSize;

    uniform int ShouldJitter;

    in vec3 vertex_position;
    in vec3 vertex_normal;
    in vec2 vertex_uv;

    out vec4 frag_worldpos;
    out vec3 frag_normal;
    out vec2 frag_uv;
    flat out int  frag_id;

    float random (vec2 st) 
    {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }    

    void main() 
    {
        /*
        const float jitter = 0.0005;
        mat4 jitter_proj = proj;
        jitter_proj[2][0] = random(vec2(Time, 0.0) * 10.0) * jitter;
        jitter_proj[2][1] = random(vec2(0.0, Time) * 10.0) * jitter;
        */

        float x = random(vec2(Time, 0.0) * 10.0);
        float y = random(vec2(0.0, Time) * 10.0);

        mat4 jitter_proj = proj;
        if (ShouldJitter == 1)
        {
            jitter_proj[2][0] = (x * 2.0 - 1.0) / WindowSize.x;
            jitter_proj[2][1] = (y * 2.0 - 1.0) / WindowSize.y;
        }

        frag_worldpos = vec4(translations[gl_InstanceID] + scales[gl_InstanceID] * vertex_position, 1.0);

        gl_Position = jitter_proj * view * frag_worldpos;
        frag_normal = (vec4(vertex_normal, 0.0)).xyz;
        frag_uv = vertex_uv;
        frag_id = gl_InstanceID;
    }`

var basePassFragmentShaderSource = 
    `#version 300 es

    #define NUM_BOXES *MAX_RASTER_PRIMITIVES_PER_BATCH*

    precision lowp float;

    in vec4 frag_worldpos;
    in vec3 frag_normal;
    in vec2 frag_uv;
    flat in int  frag_id;

    layout(location = 0) out vec4 out_color;
    layout(location = 1) out vec4 out_normal;
    layout(location = 2) out vec4 out_uv;

    uniform vec3 Color[NUM_BOXES];

    float grid (vec2 uv, float Thickness)
    {
        return mix(
            0.0, 
            1.0, 
            float((fract(uv.x * 20.0) > Thickness) || 
                (fract(uv.y * 20.0) > Thickness)));
    }

    float checkerboard(vec2 uv, float thickness)
    {
        uv *= thickness;
        return mod(floor(uv.x) + floor(uv.y), 2.0);
    }

    void main() 
    {
        float f = grid(frag_uv, 0.8);
        out_color = vec4(Color[frag_id], frag_uv.x);
        out_normal = vec4((frag_normal + 1.0) * 0.5, frag_uv.y);
        out_uv = frag_worldpos;
    }`