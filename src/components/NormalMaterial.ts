import { shaderMaterial } from '@react-three/drei'
import surfaceVertexShader from '@/shaders/surface-vertex.glsl'
import surfaceFragmentShader from '@/shaders/surface-fragment.glsl'

const surfaceVertex = surfaceVertexShader

const surfaceFragment = surfaceFragmentShader

const NormalMaterial = shaderMaterial(
  {
    time: { value: 0.0 },
    uDisplace: { value: true },
    uAmplitude: { value: 0.25 },
    uFrequency: { value: 0.75 },
  } as any,
  surfaceVertex,
  surfaceFragment,
)

export default NormalMaterial
