type ProfileTabBarProps = {
  tabs: Array<{ key: string; label: string }>;
  activeTab: string;
  onSelect: (key: string) => void;
};

export default function ProfileTabBar({ tabs, activeTab, onSelect }: ProfileTabBarProps) {
  return (
    <div className="profileTabBar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={activeTab === tab.key ? "tabLink active" : "tabLink"}
          type="button"
          onClick={() => onSelect(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
