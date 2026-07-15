function HandleApiError(response, navigate) {
    try {
        if (!response.ok) { // Check if the response was not successful
            localStorage.removeItem('token');
            window.location.reload();
            return false;
            // navigate('error501')
            // return false;
        }
        if(response.status === 200){
            return true
        }
        if(response.status === 401){
            navigate('/login')
            return false;
        }
        navigate('error501')
        return false;
      
    } catch (error) {
        navigate('error501')
        return false
    }
}

export default HandleApiError