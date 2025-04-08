  <div className="mb-4">
    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
      Description (Optional)
    </label>
    <textarea
      id="description"
      name="description"
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      rows={4}
      placeholder="Describe your donation"
    />
  </div> 