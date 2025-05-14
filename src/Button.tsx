export function Button({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      className="px-2 py-1 bg-blue-500 text-white rounded disabled:bg-blue-200 cursor-pointer disabled:cursor-not-allowed"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
