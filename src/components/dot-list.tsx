import { Fragment, type ReactNode } from "react";

export function DotList({ parts }: { parts: ReactNode[] }) {
  const shown = parts.filter(
    (part) => part !== null && part !== undefined && part !== false,
  );
  return (
    <>
      {shown.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && " "}
          <span className="whitespace-nowrap">
            {part}
            {index < shown.length - 1 && " ·"}
          </span>
        </Fragment>
      ))}
    </>
  );
}
