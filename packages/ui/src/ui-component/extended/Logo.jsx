// import logo from '@/assets/images/OSMI_white.svg'
// import logoDark from '@/assets/images/OSMI_dark.svg'
import logo from '@/assets/images/osmi_black.png'
import logoDark from '@/assets/images/osmi_white.png'

import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row', marginLeft: '10px' }}>
            <img
                style={{ objectFit: 'contain', height: 'auto', width: 150 }}
                src={customization.isDarkMode ? logoDark : logo}
                alt='OsmiAI'
            />
        </div>
    )
}

export default Logo
