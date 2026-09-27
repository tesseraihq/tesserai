import { cssVarName, type Anatomy } from "@tesserai/core";
import { mapStates, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

const NONE = mapStates(() => []);
// The active slot (the one the next character goes into) is where focus shows. input-otp marks it
// data-active="true"; Bits' PinInput with a bare data-active.
const slotStates = (active: string): StatePrefixes => ({ ...NONE, "focus-visible": [active], invalid: ["aria-invalid:"] });

// Input OTP's classes, which every framework's shell prints from. The data-slot "input-otp" is the
// hidden input the code is typed into; the row of slots is its container, which has no data-slot.
export function inputOtpPieces(anatomy: Anatomy, active = "data-[active=true]:") {
  const radius = `var(${cssVarName("input-otp.radius")})`;
  const width = cssVarName("border.width");
  const part = (name: string, states: StatePrefixes, extra: string[] = []) => flatClasses(anatomy, name, { states }, extra);
  return {
    slots: {
      "input-otp": ["disabled:cursor-not-allowed"],
      "input-otp:container": part("root", { ...NONE, disabled: ["has-disabled:"] }, ["flex", "items-center"]),
      "input-otp-group": part("group", NONE, ["flex", "items-center"]),
      "input-otp-slot": part("slot", slotStates(active), [
        "relative",
        "flex",
        "items-center",
        "justify-center",
        "outline-none",
        "transition-all",
        `${active}z-10`,
        // Slots in a group share borders and round only the ends.
        "border-s-0",
        `first:border-s-(length:${width})`,
        `first:rounded-s-[${radius}]`,
        `last:rounded-e-[${radius}]`,
      ]),
      // The blinking caret in the active slot, centred over it.
      "input-otp-slot:caret-box": ["pointer-events-none", "absolute", "inset-0", "flex", "items-center", "justify-center"],
      "input-otp-slot:caret": part("caret", NONE, ["w-px"]),
      "input-otp-separator": part("separator", NONE, ["flex", "items-center", "[&_svg]:size-4"]),
    },
  };
}

// The same on every library: shadcn uses the input-otp package for all three.
export function renderInputOtp(anatomy: Anatomy): string {
  const { slots } = inputOtpPieces(anatomy);
  const root = classString(slots["input-otp:container"]);
  const slot = classString(slots["input-otp-slot"]);
  return `import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function InputOTP({ className, containerClassName, ...props }: React.ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(${root}, containerClassName)}
      spellCheck={false}
      className={cn(${classString(slots["input-otp"])}, className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="input-otp-group" className={cn(${classString(slots["input-otp-group"])}, className)} {...props} />;
}

function InputOTPSlot({ index, className, ...props }: React.ComponentProps<"div"> & { index: number }) {
  const context = React.useContext(OTPInputContext);
  const slot = context.slots[index];
  return (
    <div data-slot="input-otp-slot" data-active={slot?.isActive ?? false} className={cn(${slot}, className)} {...props}>
      {slot?.char}
      {slot?.hasFakeCaret ? (
        <div className=${classString(slots["input-otp-slot:caret-box"])}>
          <div className={${classString(slots["input-otp-slot:caret"])}} />
        </div>
      ) : null}
    </div>
  );
}

function InputOTPSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" className={cn(${classString(slots["input-otp-separator"])}, className)} {...props}>
      <MinusIcon />
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot };
`;
}
