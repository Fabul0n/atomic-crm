import type { FallbackProps } from "react-error-boundary";
import { useResetErrorBoundaryOnLocationChange, useTranslate } from "ra-core";
import { CircleAlert, History } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { HtmlHTMLAttributes, ErrorInfo } from "react";

/**
 * App-wide error component for displaying error boundaries.
 *
 * Displays the error message and a back button.
 * In development mode, also shows the component stack trace in an expandable accordion.
 *
 * @see {@link https://marmelab.com/shadcn-admin-kit/docs/error Error documentation}
 */
export const Error = (props: InternalErrorProps & {}) => {
  const { error, errorInfo, resetErrorBoundary, ...rest } = props;
  const translate = useTranslate();

  useResetErrorBoundaryOnLocationChange(resetErrorBoundary);

  const errorMessage: string =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? (error.message ?? "")
      : typeof error === "string"
        ? error
        : String(error ?? "Unknown error");

  return (
    <div className="flex flex-col items-center md:p-16 gap-5" {...rest}>
      <h1 className="flex items-center text-3xl mt-5 mb-5 gap-3" role="alert">
        <CircleAlert className="w-2em h-2em" />
        {translate("ra.page.error", { _: "Something went wrong" })}
      </h1>
      <div>
        {translate("ra.message.error", {
          _: "An error occurred. The request could not be completed.",
        })}
      </div>
      {process.env.NODE_ENV !== "production" && (
        <>
          <Accordion
            type="multiple"
            className="mt-1 p-2 bg-secondary w-full lg:w-150"
          >
            <AccordionItem value="error">
              <AccordionTrigger className="py-2">
                {translate(errorMessage, { _: errorMessage })}
              </AccordionTrigger>
              <AccordionContent className="whitespace-pre-wrap pt-1">
                <pre className="text-xls">{errorInfo?.componentStack}</pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <p className="text-center ">
            Need help with this error? Try the following:
          </p>
          <div>
            <ul className="list-disc">
              <li>
                Check the{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://marmelab.com/shadcn-admin-kit/docs"
                >
                  shadcn-admin-kit documentation
                </a>
              </li>
              <li>
                Search on{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://stackoverflow.com/questions/tagged/shadcn-admin-kit"
                >
                  StackOverflow
                </a>{" "}
                for community answers
              </li>
              <li>
                Get help from the core team via{" "}
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href="https://marmelab.com/shadcn-admin-kit/"
                >
                  Shadcn Enterprise Edition
                </a>
              </li>
            </ul>
          </div>
        </>
      )}
      <div className="mt-8">
        <Button onClick={goBack}>
          <History />
          {translate("ra.action.back", { _: "Back" })}
        </Button>
      </div>
    </div>
  );
};

interface InternalErrorProps
  extends Omit<HtmlHTMLAttributes<HTMLDivElement>, "title">,
    FallbackProps {
  className?: string;
  errorInfo?: ErrorInfo;
}

export interface ErrorProps extends Pick<FallbackProps, "error"> {
  errorInfo?: ErrorInfo;
}

function goBack() {
  window.history.go(-1);
}
