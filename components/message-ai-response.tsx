import equal from 'fast-deep-equal';
import { memo } from 'react';

const PureMessageAiResponse = ({}) => {
  return <div>temp</div>;
};

export const MessageAiResponse = memo(
  PureMessageAiResponse,
  (prevProps, nextProps) => {
    // if (prevProps.isLoading !== nextProps.isLoading) return false;
    // if (prevProps.message.id !== nextProps.message.id) return false;
    // if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    // if (!equal(prevProps.vote, nextProps.vote)) return false;

    return true;
  },
);
