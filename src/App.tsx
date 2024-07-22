import { Canvas, useLoader } from '@react-three/fiber'
import { Perf } from 'r3f-perf'

import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useEnvironment,
  useTexture,
} from '@react-three/drei'

import { Caustics } from '@/components/Caustics'
import { Ground } from '@/components/Ground'
import { Sns } from '@/components/Sns'
import { MenuButton } from '@/components/MenuButton'
import { Loader } from '@react-three/drei'
import { useControls, Leva } from 'leva'
import { Suspense, useRef } from 'react'

const App = () => {
  return (
    <>
      <Leva collapsed />
      <MenuButton />
      <Sns />
      <Canvas dpr={[1, 2]}>
        <color attach="background" args={['#eeeeee']} />
        <Perf position="top-left" />
        <OrbitControls />
        <PerspectiveCamera makeDefault position={[0, 25, 25]} fov={65} />
        <Suspense fallback={null}>
          <Caustics />
          <Ground />
        </Suspense>
      </Canvas>
      <Loader />
    </>
  )
}

export default App
