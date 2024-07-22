import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

import causticFragmentShader from '@/shaders/caustics-fragment.glsl'
import causticVertexShader from '@/shaders/caustics-vertex.glsl'

const fragmentShader = causticFragmentShader

const vertexShader = causticVertexShader

const CausticsComputeMaterial = shaderMaterial(
  {
    uLight: { value: new THREE.Vector3(0, 0, 0) },
    uTexture: { value: null },
    uIntensity: { value: 1.0 },
  } as any,
  vertexShader,
  fragmentShader,
)

export default CausticsComputeMaterial
