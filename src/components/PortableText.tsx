import React from "react";
import { PortableText as SanityPortableText } from "@portabletext/react";

// Since we don't have @portabletext/react installed yet, we'll create a basic fallback
// This will be replaced with proper PortableText when dependencies are installed

interface PortableTextBlock {
  _type: string;
  style?: string;
  children?: Array<{
    _type: string;
    text: string;
    marks?: string[];
  }>;
}

interface PortableTextProps {
  content: PortableTextBlock[];
  className?: string;
}

export const PortableText: React.FC<PortableTextProps> = ({
  content,
  className = "",
}) => {
  if (!content || !Array.isArray(content)) {
    return null;
  }

  return (
    <div className={className}>
      <SanityPortableText value={content} />
    </div>
  );
};

export default PortableText;
