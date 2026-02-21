import { Fragment } from 'react';

const URL_REGEX = /(https?:\/\/[^\s<>)"']+)/g;

export default function LinkifyText({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);

  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}
