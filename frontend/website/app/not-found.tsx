import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-primary mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <Link
          href="/en"
          className="inline-flex items-center px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:opacity-90 transition"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
