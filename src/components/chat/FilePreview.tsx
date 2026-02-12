import { FileText, Download, Image as ImageIcon } from "lucide-react";

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  isMine: boolean;
}

const FilePreview = ({ fileUrl, fileName, fileType, isMine }: FilePreviewProps) => {
  const isImage = fileType?.startsWith("image/");

  if (isImage) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-[240px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
        />
        <span className="text-xs opacity-70 mt-1 block">{fileName}</span>
      </a>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-3 rounded-xl ${
        isMine ? "bg-primary-foreground/10" : "bg-accent"
      } hover:opacity-80 transition-opacity`}
    >
      <div className={`p-2 rounded-lg ${isMine ? "bg-primary-foreground/20" : "bg-primary/10"}`}>
        <FileText className={`h-5 w-5 ${isMine ? "text-primary-foreground" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>
        <p className="text-xs opacity-60">{fileType}</p>
      </div>
      <Download className="h-4 w-4 opacity-60" />
    </a>
  );
};

export default FilePreview;
