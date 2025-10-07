import { BuyPrompt, DoorPrompt } from "@/components/top-down-shooter";

interface PromptComponentProps {
  reloadPrompt: boolean;
  controllerConnected: boolean;
  doorPrompt: DoorPrompt | null;
  buyPrompt: BuyPrompt | null;
}

export const GamePrompts = ({ 
  reloadPrompt, 
  controllerConnected, 
  doorPrompt, 
  buyPrompt 
}: PromptComponentProps) => {
  return (
    <>
      {reloadPrompt && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded border-2 border-destructive bg-card/90 px-6 py-3 font-mono backdrop-blur-sm">
          <p className="text-center text-lg font-bold text-destructive">
            Press R{controllerConnected ? " or X" : ""} to RELOAD
          </p>
        </div>
      )}

      {doorPrompt && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded border-2 border-primary bg-card/90 px-6 py-3 font-mono backdrop-blur-sm">
          <p className="text-center text-lg font-bold text-foreground">
            Press E{controllerConnected ? " or A" : ""} to open DOOR (${doorPrompt.cost})
          </p>
        </div>
      )}

      {buyPrompt && !doorPrompt && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded border-2 border-primary bg-card/90 px-6 py-3 font-mono backdrop-blur-sm">
          <p className="text-center text-lg font-bold text-foreground">
            Press E{controllerConnected ? " or A" : ""} to buy {buyPrompt.type} (${buyPrompt.cost})
          </p>
        </div>
      )}
    </>
  );
};