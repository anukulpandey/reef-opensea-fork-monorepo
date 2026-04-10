import { SurfaceTabButton } from "../ui/ControlPrimitives";

type ProfileTabBarProps = {
  tabs: Array<{ key: string; label: string }>;
  activeTab: string;
  onSelect: (key: string) => void;
};

export default function ProfileTabBar({ tabs, activeTab, onSelect }: ProfileTabBarProps) {
  return (
    <div className="profileTabBar">
      {tabs.map((tab) => (
        <SurfaceTabButton
          key={tab.key}
          active={activeTab === tab.key}
          onClick={() => onSelect(tab.key)}
        >
          {tab.label}
        </SurfaceTabButton>
      ))}
    </div>
  );
}
