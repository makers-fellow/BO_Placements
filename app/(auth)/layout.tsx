export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-[#0F1729] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/makers%20logo%20sin%20fondo-jvNxpphOziJgTPMZw252yuXZwm5pLD.png"
            alt="Makers Fellowship"
            className="h-10 mx-auto mb-6"
          />
        </div>
        {children}
      </div>
    </main>
  )
}
