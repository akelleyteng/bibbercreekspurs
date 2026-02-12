export default function DriveFilesPage() {
  const mockFiles = [
    { id: '1', name: 'Meeting Minutes - Feb 2026.pdf', type: 'PDF', size: '245 KB', modifiedDate: 'Feb 10, 2026' },
    { id: '2', name: 'Project Guidelines.docx', type: 'Document', size: '1.2 MB', modifiedDate: 'Feb 5, 2026' },
    { id: '3', name: 'County Fair Photos', type: 'Folder', size: '—', modifiedDate: 'Jan 28, 2026' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shared Files</h1>
      
      <div className="card">
        <div className="mb-6 pb-6 border-b">
          <p className="text-gray-600">📁 Google Drive: Bibber Creek Spurs 4-H</p>
          <p className="text-sm text-gray-500 mt-1">Shared folder integration with Google Drive API</p>
        </div>

        <div className="space-y-2">
          {mockFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">
                  {file.type === 'Folder' ? '📁' : file.type === 'PDF' ? '📄' : '📝'}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {file.type} • {file.size} • Modified {file.modifiedDate}
                  </p>
                </div>
              </div>
              <button className="btn-secondary text-sm">Open</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
