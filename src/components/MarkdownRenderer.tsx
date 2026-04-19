import React from 'react';
import { Typography, Box, List, ListItem, ListItemText } from '@mui/material';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Simple markdown parser for basic features
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentListItems: string[] = [];
    let listKey = 0;

    const flushList = () => {
      if (currentListItems.length > 0) {
        elements.push(
          <List key={`list-${listKey++}`} dense sx={{ pl: 2, mb: 1 }}>
            {currentListItems.map((item, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemText 
                  primary={parseInlineMarkdown(item)}
                  sx={{ '& .MuiListItemText-primary': { fontSize: '0.875rem' } }}
                />
              </ListItem>
            ))}
          </List>
        );
        currentListItems = [];
      }
    };

    const parseInlineMarkdown = (text: string): React.ReactNode => {
      // Handle bold text **text** and italic text *text*
      const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
      
      return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return (
            <Typography
              key={index}
              component="span"
              sx={{ fontWeight: 'bold', display: 'inline' }}
            >
              {boldText}
            </Typography>
          );
        } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          const italicText = part.slice(1, -1);
          return (
            <Typography
              key={index}
              component="span"
              sx={{ fontStyle: 'italic', display: 'inline' }}
            >
              {italicText}
            </Typography>
          );
        }
        return part;
      });
    };

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      
      // Handle list items starting with -
      if (trimmedLine.startsWith('- ')) {
        flushList(); // Flush any previous list
        currentListItems.push(trimmedLine.slice(2));
        return;
      }
      
      // Handle empty lines
      if (trimmedLine === '') {
        flushList();
        elements.push(<Box key={`empty-${lineIndex}`} sx={{ height: '0.5rem' }} />);
        return;
      }
      
      // Handle regular text
      flushList();
      elements.push(
        <Typography
          key={`text-${lineIndex}`}
          variant="body2"
          sx={{ mb: 1, fontSize: '0.875rem', lineHeight: 1.5 }}
        >
          {parseInlineMarkdown(trimmedLine)}
        </Typography>
      );
    });

    // Flush any remaining list items
    flushList();

    return elements;
  };

  return (
    <Box>
      {parseMarkdown(content)}
    </Box>
  );
};

export default MarkdownRenderer;
