import React, { useRef, useState } from "react";
import { Camera, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

// Photo capture/upload component. Uploads via the client-side UploadFile
// integration and returns file URLs to the parent.
export default function PhotoCapture({ photos, onAdd, onRemove, max = 6 }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const remaining = max - (photos?.length || 0);
      const slice = Array.from(files).slice(0, remaining);
      for (const file of slice) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onAdd(file_url);
      }
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {photos && photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {photos.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border">
              <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || (photos?.length || 0) >= max}
        className="tap-target w-full border-dashed"
      >
        {uploading ? (
          <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Uploading…</span>
        ) : (
          <span className="flex items-center gap-2"><Camera className="h-5 w-5" /> {photos?.length ? "Add more photos" : "Take or add a photo"}</span>
        )}
      </Button>
    </div>
  );
}