"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";

export interface FloatingLabelInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const FloatingLabelInput = React.forwardRef<
  HTMLInputElement,
  FloatingLabelInputProps
>(({ className, label, id, ...props }, ref) => {
  const [hasValue, setHasValue] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useImperativeHandle(ref, () => inputRef.current!);

  const checkValue = () => {
    setHasValue(!!inputRef.current?.value);
  };

  React.useEffect(() => {
    checkValue();
  }, [props.value, props.defaultValue]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        className={cn(
          "peer pt-5 pb-2 transition-all",
          className
        )}
        onChange={(e) => {
          checkValue();
          props.onChange?.(e);
        }}
        {...props}
      />
      <Label
        htmlFor={id}
        className={cn(
          "absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200 pointer-events-none",
          "peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-primary",
          hasValue && "top-2 text-[10px]"
        )}
      >
        {label}
      </Label>
    </div>
  );
});

FloatingLabelInput.displayName = "FloatingLabelInput";

export { FloatingLabelInput };

