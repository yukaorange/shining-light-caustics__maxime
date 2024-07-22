export const Ground = (): JSX.Element => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial color="#f9f9f9" />
    </mesh>
  )
}
