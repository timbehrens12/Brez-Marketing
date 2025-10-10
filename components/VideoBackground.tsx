"use client"

export function VideoBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        style={{
          filter: "brightness(0.7) contrast(1.1)"
        }}
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>
      {/* Subtle overlay to blend with page */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
    </div>
  )
}

