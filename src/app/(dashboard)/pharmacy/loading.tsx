export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white border rounded-lg h-24 p-5 flex items-center space-x-4">
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-100 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white border rounded-lg shadow-sm h-96"></div>
    </div>
  )
}
