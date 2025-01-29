import React, { useState, useCallback } from 'react';
import { FileUp, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import imageCompression from 'browser-image-compression';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const convertToJPG = useCallback(async () => {
    if (!file) return;

    try {
      setConverting(true);
      setProgress(0);

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) throw new Error('Could not get canvas context');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.95);
      });

      // Compress the image
      const compressedFile = await imageCompression(new File([blob], 'converted.jpg', { type: 'image/jpeg' }), {
        maxSizeMB: 1,
        maxWidthOrHeight: 2000,
        useWebWorker: true,
        onProgress: (p) => setProgress(Math.round(p * 100))
      });

      // Create download link
      const url = URL.createObjectURL(compressedFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name.replace('.pdf', '.jpg');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error converting PDF:', error);
    } finally {
      setConverting(false);
      setProgress(0);
    }
  }, [file]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-purple-600 to-purple-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                PDF to JPG Converter
              </h1>
              <p className="text-sm text-gray-600">by <span className="font-semibold text-purple-600">mood-ui</span></p>
            </div>
            
            <div className="space-y-8">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center space-y-4"
                >
                  <FileUp className="w-16 h-16 text-orange-500" />
                  <div className="text-gray-600">
                    <span className="text-orange-500 font-semibold">Click to upload</span> or drag and drop
                    <p className="text-sm text-gray-500">PDF files only (max 10MB)</p>
                  </div>
                </label>
              </div>

              {preview && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-4">
                    <ImageIcon className="w-8 h-8 text-purple-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{file?.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file?.size ? file.size / (1024 * 1024) : 0).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {converting && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-4">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Converting... {progress}%</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={convertToJPG}
                disabled={!file || converting}
                className={`w-full py-3 px-6 rounded-xl flex items-center justify-center space-x-2 text-white font-semibold transition
                  ${file && !converting
                    ? 'bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700'
                    : 'bg-gray-300 cursor-not-allowed'
                  }`}
              >
                <Download className="w-5 h-5" />
                <span>Convert to JPG</span>
              </button>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-white text-sm">© 2025 mood-ui. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;