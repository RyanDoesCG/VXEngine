function createShader(gl, stage, source) 
{
    console.log(source)
    var shader = gl.createShader(stage);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    }

    var log = gl.getShaderInfoLog(shader);

    var lines = source.split('\n')

    var error = log.split(':')

    var line = error[2];
    
    alert(log + "\n" + lines[line]);
    gl.deleteShader(shader);
}

function createProgram(gl, vertexStage, FragmentStage) 
{
    var program = gl.createProgram();
    gl.attachShader(program, vertexStage);
    gl.attachShader(program, FragmentStage);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }
   
    alert(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}