// api/search-provider.js
export default async function handler(req, res) {
  // Add CORS headers for your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, type } = req.body;

  if (!name || name.length < 3) {
    return res.json([]);
  }

  try {
    if (type === 'provider') {
      const cleanName = name.replace(/^dr\.?\s*/i, '').trim();
      
      // Try to split name into first/last for better API results
      const nameParts = cleanName.split(' ');
      let apiUrl;
      
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        apiUrl = `https://npiregistry.cms.hhs.gov/api/?version=2.1&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&limit=10`;
      } else {
        // Single name - assume it's last name
        apiUrl = `https://npiregistry.cms.hhs.gov/api/?version=2.1&last_name=${encodeURIComponent(cleanName)}&limit=10`;
      }
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const results = data.results
          .filter(provider => 
            provider.enumeration_type === 'NPI-1' && 
            provider.basic.status === 'A'
          )
          .map(provider => {
            const location = provider.addresses.find(addr => 
              addr.address_purpose === 'LOCATION'
            ) || provider.addresses[0];
            
            const taxonomy = provider.taxonomies.find(tax => tax.primary) || provider.taxonomies[0];
            
            const formatAddress = (address) => {
              if (!address) return 'Address not available';
              const parts = [
                address.address_1, address.address_2, address.city, 
                address.state, address.postal_code
              ].filter(Boolean);
              return parts.join(', ');
            };
            
            const formatPhone = (phone) => {
              if (!phone) return 'Phone not available';
              const cleaned = phone.replace(/\D/g, '');
              if (cleaned.length === 10) {
                return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
              }
              return phone;
            };
            
            return {
              id: provider.number,
              name: `Dr. ${provider.basic.first_name} ${provider.basic.last_name}`,
              address: formatAddress(location),
              phone: formatPhone(location?.telephone_number),
              specialty: taxonomy?.desc || 'Not specified',
              npi: provider.number,
              source: 'NPI Registry',
              credentials: provider.basic.credential || '',
              gender: provider.basic.gender || '',
            };
          })
          .slice(0, 5);
        
        return res.json(results);
      }
    }
    
    return res.json([]);
    
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Search service unavailable' });
  }
}