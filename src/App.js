import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Users, Building2, User, ChevronDown, ChevronRight, Save, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

console.log('Environment check:', {
  url: process.env.REACT_APP_SUPABASE_URL,
  key: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
});

// Replace with your actual Supabase credentials later
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrgs, setExpandedOrgs] = useState(new Set());
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState('organization');
  const [selectedOrgForProvider, setSelectedOrgForProvider] = useState('');
  const [customInsurance, setCustomInsurance] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    insurances: [],
    specialty: '',
    phone: '',
    address: '',
    npi: '' 
  });
  
  // Edit states
  const [editingItem, setEditingItem] = useState(null);
  const [editType, setEditType] = useState(null); // 'organization' or 'provider'
  const [editData, setEditData] = useState({});
  const [editCustomInsurance, setEditCustomInsurance] = useState('');
  
  // Autofill states
  const [isSearching, setIsSearching] = useState(false);
  const [autofillResults, setAutofillResults] = useState([]);
  const [showAutofillResults, setShowAutofillResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Data states
  const [organizations, setOrganizations] = useState([]);
  const [independentProviders, setIndependentProviders] = useState([]);
  const [allInsurances, setAllInsurances] = useState([]);
  const [loading, setLoading] = useState(true);

const supabase = useMemo(() => {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return null;
}, []);

// Load data from Supabase on component mount
useEffect(() => {
  if (supabase) {
    loadData();
  } else {
    loadDemoData();
  }
}, [supabase]);

  const loadDemoData = () => {
    setOrganizations([
      {
        id: '1',
        name: "Central Medical Group",
        insurances: ["Molina Marketplace", "Molina Medicaid", "Blue Cross", "Medicare"],
        phone: "(555) 123-4567",
        address: "123 Main St, Suite 100",
        npi: "1234567890",
        providers: [
          {
            id: '101',
            name: "Dr. Sarah Smith",
            specialty: "Dermatology",
            phone: "(555) 123-4567",
            address: "123 Main St, Suite 100",
            npi: "1234567891",
            insurances: ["Molina Marketplace", "Blue Cross"],
            organization_id: '1'
          },
          {
            id: '102',
            name: "Dr. Michael Johnson",
            specialty: "Internal Medicine",
            phone: "(555) 123-4567",
            address: "123 Main St, Suite 100",
            npi: "1234567892",
            insurances: ["Medicare", "Molina Medicaid"],
            organization_id: '1'
          }
        ]
      },
      {
        id: '2',
        name: "Skin Care Specialists",
        insurances: ["Molina Marketplace", "United Healthcare", "Cigna"],
        phone: "(555) 234-5678",
        address: "456 Oak Ave, Floor 2",
        npi: "1234567893",
        providers: [
          {
            id: '201',
            name: "Dr. Emily Chen",
            specialty: "Dermatology",
            phone: "(555) 234-5678",
            address: "456 Oak Ave, Floor 2",
            npi: "1234567894",
            insurances: ["Molina Marketplace", "Cigna"],
            organization_id: '2'
          }
        ]
      }
    ]);
    
    setIndependentProviders([
      {
        id: '401',
        name: "Dr. James Martinez",
        specialty: "Orthopedic Surgery",
        insurances: ["Molina Medicaid", "Blue Cross", "United Healthcare"],
        phone: "(555) 456-7890",
        address: "321 Elm St, Suite 5",
        npi: "1234567895"
      }
    ]);

    setAllInsurances([
      "Molina Marketplace", "Molina Medicaid", "Blue Cross Blue Shield",
      "Medicare", "Medicaid", "Aetna", "United Healthcare", "Cigna", "Humana"
    ]);
    
    setLoading(false);
  };

const loadData = async () => {
  console.log('Attempting to load data from Supabase...');
  console.log('Supabase client:', supabase);
  
  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('custom_insurances')
      .select('*');
    
    console.log('Test query result:', testData);
    console.log('Test query error:', testError);
    
    if (testError) {
      console.error('Database error:', testError);
      throw testError;
    }

    console.log('Custom insurances loaded:', testData);
    
    // Load organizations with their providers
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select(`
        *,
        providers (*)
      `);

    if (orgsError) throw orgsError;

    // Load independent providers
    const { data: providersData, error: providersError } = await supabase
      .from('providers')
      .select('*')
      .is('organization_id', null);

    if (providersError) throw providersError;

    setOrganizations(orgsData || []);
    setIndependentProviders(providersData || []);
    setAllInsurances(testData?.map(ins => ins.name) || []);
    
    console.log('Data loaded successfully');
  } catch (error) {
    console.error('Error loading data:', error);
    loadDemoData(); // Fallback to demo data
  } finally {
    setLoading(false);
  }
};

  // Get unique insurances from existing data
  const availableInsurances = useMemo(() => {
    const existingInsurances = new Set();
    
    organizations.forEach(org => {
      if (org.insurances) {
        org.insurances.forEach(ins => existingInsurances.add(ins));
      }
    });
    
    independentProviders.forEach(provider => {
      if (provider.insurances) {
        provider.insurances.forEach(ins => existingInsurances.add(ins));
      }
    });
    
    const combined = [...new Set([...allInsurances, ...existingInsurances])];
    return combined.sort();
  }, [allInsurances, organizations, independentProviders]);

  // Fuzzy matching function
  const fuzzyMatch = (text, query) => {
  if (!query) return true;
  
  const normalizeText = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedText = normalizeText(text);
  
  // Split query into words and check if ALL words match
  const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 0);
  
  return queryWords.every(word => {
    const normalizedWord = normalizeText(word);
    return normalizedText.includes(normalizedWord);
  });
};

  // Smart search results
 // Smart search results
const searchResults = useMemo(() => {
  if (!searchQuery.trim()) {
    return { organizations, independentProviders };
  }

  const query = searchQuery.toLowerCase();
  const queryWords = query.split(' ').filter(word => word.length > 0);
  
  // Function to check if all query words match anywhere in the provider's data
  const matchesAllWords = (provider, orgName = '') => {
    const searchableText = [
      provider.name || '',
      provider.specialty || '',
      orgName,
      ...(provider.insurances || [])
    ].join(' ').toLowerCase();
    
    return queryWords.every(word => searchableText.includes(word));
  };

  const matchingOrgs = [];
  const matchingIndependent = [];

  organizations.forEach(org => {
    let orgMatches = false;
    let matchingOrgProviders = [];

    // Check if organization itself matches all search words
    const orgSearchableText = [
      org.name || '',
      ...(org.insurances || [])
    ].join(' ').toLowerCase();
    
    if (queryWords.every(word => orgSearchableText.includes(word))) {
      orgMatches = true;
    }

    // Check providers within the organization
    if (org.providers) {
      org.providers.forEach(provider => {
        if (matchesAllWords(provider, org.name)) {
          matchingOrgProviders.push(provider);
        }
      });
    }

    // Include organization if it matches or has matching providers
    if (orgMatches || matchingOrgProviders.length > 0) {
      matchingOrgs.push({
        ...org,
        providers: orgMatches ? (org.providers || []) : matchingOrgProviders,
        highlighted: orgMatches
      });
    }
  });

  // Check independent providers
  independentProviders.forEach(provider => {
    if (matchesAllWords(provider)) {
      matchingIndependent.push(provider);
    }
  });

  return { organizations: matchingOrgs, independentProviders: matchingIndependent };
}, [searchQuery, organizations, independentProviders]);

  // NPI Registry search via backend (to avoid CORS)
  const searchProviderInfo = async (searchName) => {
    console.log('=== STARTING BACKEND NPI SEARCH ===');
    console.log('Search name:', searchName);
    
    if (!searchName || !searchName.trim() || searchName.length < 3) {
      console.log('Search cancelled: name too short or empty');
      setAutofillResults([]);
      setShowAutofillResults(false);
      return;
    }

    if (addType !== 'provider') {
      console.log('Search cancelled: not adding provider');
      setAutofillResults([]);
      setShowAutofillResults(false);
      return;
    }

    console.log('Calling backend NPI search...');
    setIsSearching(true);
    
    try {
      const response = await fetch('/api/search-provider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: searchName,
          type: 'provider'
        }),
      });
      
      console.log('Backend response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }
      
      const results = await response.json();
      console.log('Backend results:', results);
      
      if (results && results.length > 0) {
        console.log('Setting', results.length, 'results from backend');
        setAutofillResults(results);
        setShowAutofillResults(true);
      } else {
        console.log('No results from backend');
        setAutofillResults([{
          id: `no_results_${Date.now()}`,
          name: `No NPI records found for "${searchName}"`,
          address: "Try different name or spelling",
          phone: "Manual entry required", 
          specialty: "Please specify manually",
          npi: "",
          source: "No NPI Records"
        }]);
        setShowAutofillResults(true);
      }
      
    } catch (error) {
      console.log('=== BACKEND API ERROR ===');
      console.error('Error calling backend:', error);
      
      setAutofillResults([{
        id: `error_${Date.now()}`,
        name: `Backend Error for "${searchName}"`,
        address: `Error: ${error.message}`,
        phone: "Manual entry required",
        specialty: "Please specify manually", 
        npi: "",
        source: "Backend Error"
      }]);
      setShowAutofillResults(true);
      
    } finally {
      console.log('Setting isSearching to false');
      setIsSearching(false);
      console.log('=== BACKEND SEARCH COMPLETE ===');
    }
  };

  const handleNameChange = (value) => {
    console.log('=== NAME CHANGE ===');
    console.log('New value:', value);
    console.log('Current addType:', addType);
    
    setNewItem({...newItem, name: value});
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Only search if we're adding a provider
    if (addType === 'provider') {
      console.log('Setting timeout for NPI search...');
      const newTimeout = setTimeout(() => {
        console.log('Timeout complete, calling NPI search...');
        searchProviderInfo(value);
      }, 1000);
      
      setSearchTimeout(newTimeout);
    } else {
      console.log('Not searching - addType is:', addType);
    }
  };

  const selectAutofillResult = (result) => {
    setNewItem({
      ...newItem,
      name: result.name,
      phone: result.phone,
      address: result.address,
      specialty: result.specialty || newItem.specialty,
      npi: result.npi || newItem.npi
    });
    setShowAutofillResults(false);
    setAutofillResults([]);
  };

  const toggleExpanded = (orgId) => {
    const newExpanded = new Set(expandedOrgs);
    if (newExpanded.has(orgId)) {
      newExpanded.delete(orgId);
    } else {
      newExpanded.add(orgId);
    }
    setExpandedOrgs(newExpanded);
  };

  // Edit functions
  const startEditingOrganization = (org) => {
    setEditingItem(org.id);
    setEditType('organization');
    setEditData({
      name: org.name,
      phone: org.phone || '',
      address: org.address || '',
      npi: org.npi || '',
      insurances: [...(org.insurances || [])]
    });
    setEditCustomInsurance('');
  };

  const startEditingProvider = (provider, organizationId = null) => {
    setEditingItem(provider.id);
    setEditType('provider');
    setEditData({
      name: provider.name,
      specialty: provider.specialty || '',
      phone: provider.phone || '',
      address: provider.address || '',
      npi: provider.npi || '',
      insurances: [...(provider.insurances || [])],
      organizationId // Track if this is an org provider or independent
    });
    setEditCustomInsurance('');
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditType(null);
    setEditData({});
    setEditCustomInsurance('');
  };

  const addEditInsurance = (insurance) => {
    if (!editData.insurances.includes(insurance)) {
      setEditData({
        ...editData,
        insurances: [...editData.insurances, insurance]
      });
    }
  };

  const addEditCustomInsurance = () => {
    const trimmedInsurance = editCustomInsurance.trim();
    if (!trimmedInsurance) return;

    if (!availableInsurances.includes(trimmedInsurance)) {
      setAllInsurances([...allInsurances, trimmedInsurance]);
    }

    if (!editData.insurances.includes(trimmedInsurance)) {
      setEditData({
        ...editData,
        insurances: [...editData.insurances, trimmedInsurance]
      });
    }
    
    setEditCustomInsurance('');
  };

  const removeEditInsurance = (insurance) => {
    setEditData({
      ...editData,
      insurances: editData.insurances.filter(ins => ins !== insurance)
    });
  };

  const saveEdit = async () => {
    try {
      if (editType === 'organization') {
        if (supabase) {
          const { error } = await supabase
            .from('organizations')
            .update({
              name: editData.name,
              phone: editData.phone,
              address: editData.address,
              npi: editData.npi,
              insurances: editData.insurances
            })
            .eq('id', editingItem);

          if (error) throw error;
        }

        // Update local state
        setOrganizations(organizations.map(org => {
          if (org.id === editingItem) {
            return {
              ...org,
              name: editData.name,
              phone: editData.phone,
              address: editData.address,
              npi: editData.npi,
              insurances: editData.insurances
            };
          }
          return org;
        }));
      } else if (editType === 'provider') {
        if (supabase) {
          const { error } = await supabase
            .from('providers')
            .update({
              name: editData.name,
              specialty: editData.specialty,
              phone: editData.phone,
              address: editData.address,
              npi: editData.npi,
              insurances: editData.insurances
            })
            .eq('id', editingItem);

          if (error) throw error;
        }

        // Update local state
        if (editData.organizationId) {
          // Update provider within organization
          setOrganizations(organizations.map(org => {
            if (org.providers && org.providers.some(p => p.id === editingItem)) {
              return {
                ...org,
                providers: org.providers.map(provider => {
                  if (provider.id === editingItem) {
                    return {
                      ...provider,
                      name: editData.name,
                      specialty: editData.specialty,
                      phone: editData.phone,
                      address: editData.address,
                      npi: editData.npi,
                      insurances: editData.insurances
                    };
                  }
                  return provider;
                })
              };
            }
            return org;
          }));
        } else {
          // Update independent provider
          setIndependentProviders(independentProviders.map(provider => {
            if (provider.id === editingItem) {
              return {
                ...provider,
                name: editData.name,
                specialty: editData.specialty,
                phone: editData.phone,
                address: editData.address,
                npi: editData.npi,
                insurances: editData.insurances
              };
            }
            return provider;
          }));
        }
      }

      cancelEditing();
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Error saving changes. Please try again.');
    }
  };

const handleAddItem = async () => {
  if (!newItem.name) return;

  try {
    if (addType === 'organization') {
      if (supabase) {
        const { data, error } = await supabase
          .from('organizations')
          .insert([{
            name: newItem.name,
            phone: newItem.phone,
            address: newItem.address,
            insurances: newItem.insurances,
            npi: newItem.npi 
          }])
          .select()
          .single();

        if (error) throw error;
        
        setOrganizations([...organizations, {...data, providers: []}]);
      } else {
        // Demo mode fallback
        const newOrg = {
          id: Date.now().toString(),
          ...newItem,
          providers: []
        };
        setOrganizations([...organizations, newOrg]);
      }
    } else {
      if (selectedOrgForProvider && supabase) {
        const { data, error } = await supabase
          .from('providers')
          .insert([{
            name: newItem.name,
            specialty: newItem.specialty,
            phone: newItem.phone,
            address: newItem.address,
            insurances: newItem.insurances,
            organization_id: selectedOrgForProvider,
            npi: newItem.npi 
          }])
          .select()
          .single();

        if (error) throw error;

        setOrganizations(organizations.map(org => {
          if (org.id === selectedOrgForProvider) {
            return {
              ...org,
              providers: [...(org.providers || []), data]
            };
          }
          return org;
        }));
      } else if (supabase) {
        const { data, error } = await supabase
          .from('providers')
          .insert([{
            name: newItem.name,
            specialty: newItem.specialty,
            phone: newItem.phone,
            address: newItem.address,
            insurances: newItem.insurances,
            npi: newItem.npi
          }])
          .select()
          .single();

        if (error) throw error;
        
        setIndependentProviders([...independentProviders, data]);
      } else {
        // Demo mode fallback
        const newProvider = {
          id: Date.now().toString(),
          ...newItem
        };
        
        if (selectedOrgForProvider) {
          setOrganizations(organizations.map(org => {
            if (org.id === selectedOrgForProvider) {
              return {
                ...org,
                providers: [...(org.providers || []), {...newProvider, organization_id: selectedOrgForProvider}]
              };
            }
            return org;
          }));
        } else {
          setIndependentProviders([...independentProviders, newProvider]);
        }
      }
    }

    // Reset form
    setNewItem({ name: '', insurances: [], specialty: '', phone: '', address: '',  npi: ''});
    setSelectedOrgForProvider('');
    setCustomInsurance('');
    setAutofillResults([]);
    setShowAutofillResults(false);
    setShowAddForm(false);
  } catch (error) {
    console.error('Error adding item:', error);
    alert('Error adding item. Please try again.');
  }
};

  const addInsurance = (insurance) => {
    if (!newItem.insurances.includes(insurance)) {
      setNewItem({
        ...newItem,
        insurances: [...newItem.insurances, insurance]
      });
    }
  };

  const addCustomInsurance = () => {
    const trimmedInsurance = customInsurance.trim();
    if (!trimmedInsurance) return;

    if (!availableInsurances.includes(trimmedInsurance)) {
      setAllInsurances([...allInsurances, trimmedInsurance]);
    }

    if (!newItem.insurances.includes(trimmedInsurance)) {
      setNewItem({
        ...newItem,
        insurances: [...newItem.insurances, trimmedInsurance]
      });
    }
    
    setCustomInsurance('');
  };

  const handleCustomInsuranceKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomInsurance();
    }
  };

  const handleEditCustomInsuranceKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEditCustomInsurance();
    }
  };

  const removeInsurance = (insurance) => {
    setNewItem({
      ...newItem,
      insurances: newItem.insurances.filter(ins => ins !== insurance)
    });
  };

  const deleteOrganization = async (id) => {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    }
    
    setOrganizations(organizations.filter(org => org.id !== id));
  } catch (error) {
    console.error('Error deleting organization:', error);
    alert('Error deleting organization. Please try again.');
  }
};

 const deleteProvider = async (providerId, organizationId = null) => {
  try {
    if (supabase) {
      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', providerId);
      
      if (error) throw error;
    }
    
    if (organizationId) {
      setOrganizations(organizations.map(org => {
        if (org.id === organizationId) {
          return {
            ...org,
            providers: org.providers.filter(p => p.id !== providerId)
          };
        }
        return org;
      }));
    } else {
      setIndependentProviders(independentProviders.filter(p => p.id !== providerId));
    }
  } catch (error) {
    console.error('Error deleting provider:', error);
    alert('Error deleting provider. Please try again.');
  }
};

  const totalResults = searchResults.organizations.length + searchResults.independentProviders.length;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 bg-white">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading provider database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Provider Database</h1>
        <p className="text-gray-600">Smart search for organizations, providers, insurances, and specialties</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search organizations, providers, insurances, or specialties (e.g., 'molina medicaid derm')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          />
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-500">
            Found {totalResults} result{totalResults !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Add Item Controls */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-700">Directory</h2>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setAddType('organization');
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Building2 className="h-4 w-4" />
            Add Organization
          </button>
          <button
            onClick={() => {
              setAddType('provider');
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <User className="h-4 w-4" />
            Add Provider
          </button>
        </div>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="mb-6 p-6 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {addType === 'organization' ? (
              <>
                <Building2 className="h-5 w-5" />
                Add New Organization
              </>
            ) : (
              <>
                <User className="h-5 w-5" />
                Add New Provider
              </>
            )}
          </h3>

          {addType === 'provider' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add to Organization (optional):
              </label>
              <select
                value={selectedOrgForProvider}
                onChange={(e) => setSelectedOrgForProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Independent Provider</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder={addType === 'organization' ? "Organization Name" : "Provider Name"}
                value={newItem.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
              
              {/* Autofill Results Dropdown */}
              {showAutofillResults && autofillResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700">Found {autofillResults.length} result{autofillResults.length !== 1 ? 's' : ''}:</h4>
                  </div>
                  {autofillResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => selectAutofillResult(result)}
                      className="w-full p-4 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-gray-800">
                          {result.name}
                          {result.credentials && <span className="text-sm text-gray-500 ml-1">({result.credentials})</span>}
                        </h5>
                        <span className={`text-xs px-2 py-1 rounded ${
                          result.source === 'LIVE NPI Registry' 
                            ? 'bg-green-100 text-green-800' 
                            : result.source === 'CORS Blocked'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {result.source}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>📍 {result.address}</p>
                        <p>📞 {result.phone}</p>
                        <p>🏥 {result.specialty}</p>
                        {result.npi && <p>🆔 NPI: {result.npi}</p>}
                        {result.gender && <p>👤 {result.gender === 'M' ? 'Male' : result.gender === 'F' ? 'Female' : result.gender}</p>}
                      </div>
                    </button>
                  ))}
                  <div className="p-3 bg-gray-50 border-t border-gray-200">
                    <button
                      onClick={() => setShowAutofillResults(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Close suggestions
                    </button>
                    <p className="text-xs text-gray-400 mt-1">
                      Data from CMS NPI Registry - Verify all information before saving
                    </p>
                  </div>
                </div>
              )}
            </div>
            {addType === 'provider' && (
              <input
                type="text"
                placeholder="Specialty"
                value={newItem.specialty}
                onChange={(e) => setNewItem({...newItem, specialty: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
            <input
              type="text"
              placeholder="Phone Number"
              value={newItem.phone}
              onChange={(e) => setNewItem({...newItem, phone: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Address"
              value={newItem.address}
              onChange={(e) => setNewItem({...newItem, address: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="NPI Number (optional)"
              value={newItem.npi}
              onChange={(e) => setNewItem({...newItem, npi: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Insurance section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Insurances Accepted:
            </label>
            
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                placeholder="Add custom insurance (e.g., 'Kaiser Permanente', 'Tricare')"
                value={customInsurance}
                onChange={(e) => setCustomInsurance(e.target.value)}
                onKeyPress={handleCustomInsuranceKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={addCustomInsurance}
                disabled={!customInsurance.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Add
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {availableInsurances.map(insurance => (
                <button
                  key={insurance}
                  type="button"
                  onClick={() => addInsurance(insurance)}
                  className={`text-left px-3 py-2 text-sm rounded border transition-colors ${
                    newItem.insurances.includes(insurance)
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {insurance}
                </button>
              ))}
            </div>
            
            {newItem.insurances.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Selected insurances:</p>
                <div className="flex flex-wrap gap-2">
                  {newItem.insurances.map(insurance => (
                    <span
                      key={insurance}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"
                    >
                      {insurance}
                      <button
                        type="button"
                        onClick={() => removeInsurance(insurance)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleAddItem}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              Add {addType === 'organization' ? 'Organization' : 'Provider'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {totalResults === 0 && searchQuery ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No results found</p>
            <p className="text-sm">Try a different search term or add a new organization/provider</p>
          </div>
        ) : (
          <>
            {/* Organizations */}
            {searchResults.organizations.map(org => {
              const isExpanded = expandedOrgs.has(org.id);
              const isEditing = editingItem === org.id && editType === 'organization';
              
              return (
                <div key={org.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {/* Organization Header */}
                  <div className="p-6 bg-green-50 border-b border-green-100">
                    {isEditing ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                          <Building2 className="h-5 w-5 text-green-600" />
                          <h3 className="text-xl font-semibold text-gray-800">Edit Organization</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="Organization Name"
                            value={editData.name || ''}
                            onChange={(e) => setEditData({...editData, name: e.target.value})}
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            placeholder="Phone Number"
                            value={editData.phone || ''}
                            onChange={(e) => setEditData({...editData, phone: e.target.value})}
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            placeholder="Address"
                            value={editData.address || ''}
                            onChange={(e) => setEditData({...editData, address: e.target.value})}
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            placeholder="NPI Number"
                            value={editData.npi || ''}
                            onChange={(e) => setEditData({...editData, npi: e.target.value})}
                            className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Edit Insurance section */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Insurances Accepted:
                          </label>
                          
                          <div className="mb-3 flex gap-2">
                            <input
                              type="text"
                              placeholder="Add custom insurance"
                              value={editCustomInsurance}
                              onChange={(e) => setEditCustomInsurance(e.target.value)}
                              onKeyPress={handleEditCustomInsuranceKeyPress}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            />
                            <button
                              type="button"
                              onClick={addEditCustomInsurance}
                              disabled={!editCustomInsurance.trim()}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                            >
                              Add
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                            {availableInsurances.map(insurance => (
                              <button
                                key={insurance}
                                type="button"
                                onClick={() => addEditInsurance(insurance)}
                                className={`text-left px-3 py-2 text-sm rounded border transition-colors ${
                                  editData.insurances?.includes(insurance)
                                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {insurance}
                              </button>
                            ))}
                          </div>
                          
                          {editData.insurances && editData.insurances.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm text-gray-600 mb-2">Selected insurances:</p>
                              <div className="flex flex-wrap gap-2">
                                {editData.insurances.map(insurance => (
                                  <span
                                    key={insurance}
                                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"
                                  >
                                    {insurance}
                                    <button
                                      type="button"
                                      onClick={() => removeEditInsurance(insurance)}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-3">
                          <button
                            onClick={saveEdit}
                            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                          >
                            <Save className="h-4 w-4" />
                            Save Changes
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex items-center gap-2 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <button
                              onClick={() => toggleExpanded(org.id)}
                              className="flex items-center gap-2 text-left"
                            >
                              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                              <Building2 className="h-5 w-5 text-green-600" />
                              <h3 className="text-xl font-semibold text-gray-800">{org.name}</h3>
                            </button>
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                              Organization
                            </span>
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                              {org.providers?.length || 0} provider{(org.providers?.length || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="mb-3 text-gray-600">
                            <p>📞 {org.phone}</p>
                            <p>📍 {org.address}</p>
                            {org.npi && <p>🏥 NPI: {org.npi}</p>}
                          </div>
                          <div>
                            <p className="text-gray-700 font-medium mb-2">Insurances Accepted:</p>
                            <div className="flex flex-wrap gap-2">
                              {(org.insurances || []).map(insurance => (
                                <span
                                  key={insurance}
                                  className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-200"
                                >
                                  {insurance}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button 
                            onClick={() => startEditingOrganization(org)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => deleteOrganization(org.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Providers within organization */}
                  {isExpanded && org.providers && !isEditing && (
                    <div className="divide-y divide-gray-100">
                      {org.providers.map(provider => {
                        const isEditingProvider = editingItem === provider.id && editType === 'provider';
                        
                        return (
                          <div key={provider.id} className="p-6 pl-12">
                            {isEditingProvider ? (
                              // Provider Edit Mode
                              <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-4">
                                  <User className="h-4 w-4 text-blue-600" />
                                  <h4 className="text-lg font-semibold text-gray-800">Edit Provider</h4>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <input
                                    type="text"
                                    placeholder="Provider Name"
                                    value={editData.name || ''}
                                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Specialty"
                                    value={editData.specialty || ''}
                                    onChange={(e) => setEditData({...editData, specialty: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Phone Number"
                                    value={editData.phone || ''}
                                    onChange={(e) => setEditData({...editData, phone: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Address"
                                    value={editData.address || ''}
                                    onChange={(e) => setEditData({...editData, address: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <input
                                    type="text"
                                    placeholder="NPI Number"
                                    value={editData.npi || ''}
                                    onChange={(e) => setEditData({...editData, npi: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>

                                {/* Provider Edit Insurance section */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Provider Insurances:
                                  </label>
                                  
                                  <div className="mb-3 flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Add custom insurance"
                                      value={editCustomInsurance}
                                      onChange={(e) => setEditCustomInsurance(e.target.value)}
                                      onKeyPress={handleEditCustomInsuranceKeyPress}
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={addEditCustomInsurance}
                                      disabled={!editCustomInsurance.trim()}
                                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                                    >
                                      Add
                                    </button>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                                    {availableInsurances.map(insurance => (
                                      <button
                                        key={insurance}
                                        type="button"
                                        onClick={() => addEditInsurance(insurance)}
                                        className={`text-left px-3 py-2 text-sm rounded border transition-colors ${
                                          editData.insurances?.includes(insurance)
                                            ? 'bg-purple-100 border-purple-300 text-purple-800'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                      >
                                        {insurance}
                                      </button>
                                    ))}
                                  </div>
                                  
                                  {editData.insurances && editData.insurances.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-sm text-gray-600 mb-2">Selected insurances:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {editData.insurances.map(insurance => (
                                          <span
                                            key={insurance}
                                            className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm flex items-center gap-1"
                                          >
                                            {insurance}
                                            <button
                                              type="button"
                                              onClick={() => removeEditInsurance(insurance)}
                                              className="text-purple-600 hover:text-purple-800"
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-3">
                                  <button
                                    onClick={saveEdit}
                                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                                  >
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                  </button>
                                  <button
                                    onClick={cancelEditing}
                                    className="flex items-center gap-2 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Provider View Mode
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <h4 className="text-lg font-medium text-gray-800">{provider.name}</h4>
                                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                                      {provider.specialty}
                                    </span>
                                  </div>
                                  <div className="text-gray-600 space-y-1">
                                    <p>📞 {provider.phone}</p>
                                    {provider.address && <p>📍 {provider.address}</p>}
                                    {provider.npi && <p>🏥 NPI: {provider.npi}</p>}
                                  </div>
                                  {provider.insurances && provider.insurances.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-gray-700 font-medium mb-2">Provider Insurances:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {provider.insurances.map(insurance => (
                                          <span
                                            key={insurance}
                                            className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs border border-purple-200"
                                          >
                                            {insurance}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <button 
                                    onClick={() => startEditingProvider(provider, org.id)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => deleteProvider(provider.id, org.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Independent Providers */}
            {searchResults.independentProviders.map(provider => {
              const isEditingProvider = editingItem === provider.id && editType === 'provider';
              
              return (
                <div key={provider.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  {isEditingProvider ? (
                    // Independent Provider Edit Mode
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <User className="h-5 w-5 text-blue-600" />
                        <h3 className="text-xl font-semibold text-gray-800">Edit Independent Provider</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Provider Name"
                          value={editData.name || ''}
                          onChange={(e) => setEditData({...editData, name: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Specialty"
                          value={editData.specialty || ''}
                          onChange={(e) => setEditData({...editData, specialty: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={editData.phone || ''}
                          onChange={(e) => setEditData({...editData, phone: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Address"
                          value={editData.address || ''}
                          onChange={(e) => setEditData({...editData, address: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="NPI Number"
                          value={editData.npi || ''}
                          onChange={(e) => setEditData({...editData, npi: e.target.value})}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Independent Provider Edit Insurance section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Insurances Accepted:
                        </label>
                        
                        <div className="mb-3 flex gap-2">
                          <input
                            type="text"
                            placeholder="Add custom insurance"
                            value={editCustomInsurance}
                            onChange={(e) => setEditCustomInsurance(e.target.value)}
                            onKeyPress={handleEditCustomInsuranceKeyPress}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          />
                          <button
                            type="button"
                            onClick={addEditCustomInsurance}
                            disabled={!editCustomInsurance.trim()}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                          >
                            Add
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                          {availableInsurances.map(insurance => (
                            <button
                              key={insurance}
                              type="button"
                              onClick={() => addEditInsurance(insurance)}
                              className={`text-left px-3 py-2 text-sm rounded border transition-colors ${
                                editData.insurances?.includes(insurance)
                                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {insurance}
                            </button>
                          ))}
                        </div>
                        
                        {editData.insurances && editData.insurances.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600 mb-2">Selected insurances:</p>
                            <div className="flex flex-wrap gap-2">
                              {editData.insurances.map(insurance => (
                                <span
                                  key={insurance}
                                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"
                                >
                                  {insurance}
                                  <button
                                    type="button"
                                    onClick={() => removeEditInsurance(insurance)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={saveEdit}
                          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="flex items-center gap-2 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Independent Provider View Mode
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="h-5 w-5 text-blue-600" />
                          <h3 className="text-xl font-semibold text-gray-800">{provider.name}</h3>
                          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                            {provider.specialty}
                          </span>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            Independent Provider
                          </span>
                        </div>
                        <div className="mb-3 text-gray-600">
                          <p>📞 {provider.phone}</p>
                          <p>📍 {provider.address}</p>
                          {provider.npi && <p>🏥 NPI: {provider.npi}</p>}
                        </div>
                        <div>
                          <p className="text-gray-700 font-medium mb-2">Insurances Accepted:</p>
                          <div className="flex flex-wrap gap-2">
                            {(provider.insurances || []).map(insurance => (
                              <span
                                key={insurance}
                                className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm border border-blue-200"
                              >
                                {insurance}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button 
                          onClick={() => startEditingProvider(provider)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => deleteProvider(provider.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500">
        <p className="text-sm">
          Provider Database - Smart search and management for healthcare providers
        </p>
        <p className="text-xs mt-1">
          {supabase ? 'Connected to database' : 'Demo mode - data will not persist'}
        </p>
      </div>
    </div>
  );
}

export default App;