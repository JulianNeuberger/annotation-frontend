interface ButtonProps {
    direction: string;
    onClick: () => void;
}

const BondaryButton = ({ direction, onClick }: ButtonProps) => (
    <div
        onClick={onClick}
        style={{
            cursor: 'pointer',
            fontSize: '10px', 
            lineHeight: '12px', 
            color: 'white',
            textAlign: 'center',
            width: '10px',
            userSelect: 'none',
            border: '1px solid white',
            borderRadius: '15px',
    }}>
    {direction === 'left' ? '◀︎' : '▶︎'}
    </div>
)

export default BondaryButton;