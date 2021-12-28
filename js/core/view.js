class ViewData
{
    ProjectionMatrix
    WorldToViewMatrix
    ViewToWorldMatrix

    CameraForward
    CameraRight
    CameraUp

    // ax + by + cz + d = 0
    FrustumTop   
    FrustumBottom
    FrustumFront 
    FrustumBack  
    FrustumLeft  
    FrustumRight

    WorldForward = vec4(0.0, 0.0, -1.0, 0.0);
    WorldRight = vec4(1.0, 0.0, 0.0, 0.0);
    WorldUp = vec4(0.0, 1.0, 0.0, 0.0);

    constructor(CameraPosition, CameraRotation, Width, Height, Near, Far, FoV)
    {
        this.ProjectionMatrix = perspective(FoV, Near, Far, Width, Height)

        this.WorldToViewMatrix = identity()
        this.WorldToViewMatrix = multiplym(translate(-CameraPosition[0], -CameraPosition[1], -CameraPosition[2]), this.WorldToViewMatrix)
        this.WorldToViewMatrix = multiplym(rotate(CameraRotation[0], CameraRotation[1], CameraRotation[2]), this.WorldToViewMatrix) 
        
        this.ViewToWorldMatrix = identity()
        this.ViewToWorldMatrix = multiplym(translate(CameraPosition[0], CameraPosition[1], CameraPosition[2]), this.ViewToWorldMatrix)
        this.ViewToWorldMatrix = multiplym(rotateRev(-CameraRotation[0], -CameraRotation[1], -CameraRotation[2]), this.ViewToWorldMatrix)

        this.CameraForward = normalize(multiplyv(this.WorldForward, this.ViewToWorldMatrix))
        this.CameraRight = normalize(multiplyv(this.WorldRight, this.ViewToWorldMatrix))
        this.CameraUp = normalize(multiplyv(this.WorldUp, this.ViewToWorldMatrix))

        let viewProj = identity()
        viewProj = multiplym(this.ProjectionMatrix, this.WorldToViewMatrix)

        this.FrustumLeft   = [ access(viewProj, 0, 3) + access(viewProj, 0, 0), access(viewProj, 1, 3) + access(viewProj, 1, 0), access(viewProj, 2, 3) + access(viewProj, 2, 0), access(viewProj, 3, 3) + access(viewProj, 3, 0)]
        this.FrustumRight  = [ access(viewProj, 0, 3) - access(viewProj, 0, 0), access(viewProj, 1, 3) - access(viewProj, 1, 0), access(viewProj, 2, 3) - access(viewProj, 2, 0), access(viewProj, 3, 3) - access(viewProj, 3, 0)]
        this.FrustumTop    = [ access(viewProj, 1, 3) - access(viewProj, 1, 1), access(viewProj, 2, 3) - access(viewProj, 2, 1), access(viewProj, 0, 3) - access(viewProj, 0, 1), access(viewProj, 3, 3) - access(viewProj, 3, 1)]
        this.FrustumBottom = [ access(viewProj, 0, 3) + access(viewProj, 0, 1), access(viewProj, 1, 3) + access(viewProj, 1, 1), access(viewProj, 2, 3) + access(viewProj, 2, 1), access(viewProj, 3, 3) + access(viewProj, 3, 1)]
        this.FrustumFront  = [ access(viewProj, 0, 3) + access(viewProj, 0, 2), access(viewProj, 1, 3) + access(viewProj, 1, 2), access(viewProj, 2, 3) + access(viewProj, 2, 2), access(viewProj, 3, 3) + access(viewProj, 3, 2)]
        this.FrustumBack   = [ access(viewProj, 0, 3) - access(viewProj, 0, 2), access(viewProj, 1, 3) - access(viewProj, 1, 2), access(viewProj, 2, 3) - access(viewProj, 2, 2), access(viewProj, 3, 3) - access(viewProj, 3, 2)]
    }
}