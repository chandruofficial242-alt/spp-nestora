export interface TranslationDict {
  brand: {
    name: string;
    tagline: string;
    subTagline: string;
    officialCoordination: string;
    disclaimer: string;
  };
  nav: {
    home: string;
    landSale: string;
    houseSale: string;
    houseRent: string;
    allProperties: string;
    about: string;
    contact: string;
    becomeDealer: string;
    dealerLogin: string;
    addProperty: string;
    customerDashboard: string;
    dealerDashboard: string;
    adminDashboard: string;
    login: string;
    register: string;
    logout: string;
    switchLang: string;
    saved: string;
  };
  notice: {
    title: string;
    content: string;
    agreeCheckbox: string;
    acceptBtn: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    propertyType: string;
    allTypes: string;
    selectDistrict: string;
    allDistricts: string;
    priceRange: string;
    anyPrice: string;
    searchBtn: string;
    verifiedListingsCount: string;
    districtsCovered: string;
    assistedDeals: string;
  };
  categories: {
    title: string;
    subtitle: string;
    landSaleTitle: string;
    landSaleDesc: string;
    houseSaleTitle: string;
    houseSaleDesc: string;
    houseRentTitle: string;
    houseRentDesc: string;
    exploreCategory: string;
    viewAllListings: string;
  };
  location: {
    title: string;
    subtitle: string;
    nearYou: string;
    exploreByDistrict: string;
    allDistricts: string;
    selectCity: string;
    selectArea: string;
  };
  filters: {
    filterTitle: string;
    clearAll: string;
    apply: string;
    resultsFound: string;
    propertyType: string;
    saleOrRent: string;
    district: string;
    cityArea: string;
    budget: string;
    areaSqft: string;
    bedrooms: string;
    furnishing: string;
    parking: string;
    verifiedOnly: string;
    dtcpApproved: string;
    sortBy: string;
    sortNewest: string;
    sortPriceLowHigh: string;
    sortPriceHighLow: string;
    sortSqftHighLow: string;
    viewGrid: string;
    viewList: string;
  };
  property: {
    propertyId: string;
    sale: string;
    rent: string;
    land: string;
    house: string;
    perMonth: string;
    sqft: string;
    bhk: string;
    baths: string;
    postedOn: string;
    verified: string;
    featured: string;
    viewDetails: string;
    callNow: string;
    whatsapp: string;
    scheduleVisit: string;
    overview: string;
    description: string;
    specifications: string;
    amenities: string;
    locationDetails: string;
    videoTour: string;
    videoNotice: string;
    officialContactOnly: string;
    contactOfficialDesc: string;
    facing: string;
    parkingAvailable: string;
    furnishingStatus: string;
    deposit: string;
    maintenance: string;
    reportListing: string;
    shareListing: string;
    saveToFavorites: string;
    similarProperties: string;
    noPropertiesFound: string;
    noPropertiesDesc: string;
    soldOut: string;
    rentedOut: string;
  };
  auth: {
    welcomeBack: string;
    loginSubtitle: string;
    createAccount: string;
    registerSubtitle: string;
    iAmA: string;
    customer: string;
    dealer: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    businessName: string;
    district: string;
    city: string;
    address: string;
    dealerType: string;
    loginBtn: string;
    registerBtn: string;
    forgotPassword: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
    dealerPendingNotice: string;
    dealerPendingDesc: string;
    demoAdminCredentials: string;
    demoDealerCredentials: string;
    demoCustomerCredentials: string;
  };
  addProperty: {
    title: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
    step6: string;
    selectType: string;
    propertyTitle: string;
    propertyTitleTa: string;
    description: string;
    price: string;
    areaSqft: string;
    bedrooms: string;
    bathrooms: string;
    furnishing: string;
    facing: string;
    district: string;
    city: string;
    taluk: string;
    area: string;
    address: string;
    pincode: string;
    uploadImages: string;
    uploadVideo: string;
    reviewTitle: string;
    listingFeeTitle: string;
    listingFeeDesc: string;
    payAndSubmit: string;
    prevStep: string;
    nextStep: string;
    listingFeeAmount: string;
    paymentNote: string;
  };
  dashboard: {
    overview: string;
    properties: string;
    myListings: string;
    enquiries: string;
    siteVisits: string;
    payments: string;
    settings: string;
    dealers: string;
    users: string;
    revenue: string;
    totalProperties: string;
    activeListings: string;
    soldProperties: string;
    rentedProperties: string;
    pendingApproval: string;
    totalListingFees: string;
    totalEnquiries: string;
    markAsSold: string;
    markAsRented: string;
    hideListing: string;
    unhideListing: string;
    editListing: string;
    deleteListing: string;
    approve: string;
    reject: string;
    rejectReason: string;
    officialSettings: string;
    saveChanges: string;
  };
  enquiryModal: {
    title: string;
    subtitle: string;
    yourName: string;
    yourPhone: string;
    preferredDate: string;
    preferredTime: string;
    message: string;
    submitEnquiry: string;
    enquirySuccess: string;
    enquirySuccessDesc: string;
  };
  footer: {
    aboutText: string;
    quickLinks: string;
    forDealers: string;
    support: string;
    languages: string;
    rights: string;
    disclaimerTitle: string;
    disclaimerBody: string;
    emergencyCall: string;
  };
}

export const translations: Record<'en' | 'ta', TranslationDict> = {
  en: {
    brand: {
      name: 'SPP Nestora',
      tagline: 'Find Your Place. Build Your Future.',
      subTagline: 'Land | Houses | Rentals | Properties',
      officialCoordination: 'All enquiries are directly coordinated by SPP Nestora Platform Team.',
      disclaimer: 'Independent property verification, documents verification, and agreements are the responsibility of the respective parties.',
    },
    nav: {
      home: 'Home',
      landSale: 'Land for Sale',
      houseSale: 'House for Sale',
      houseRent: 'House for Rent',
      allProperties: 'All Properties',
      about: 'About Us',
      contact: 'Contact Us',
      becomeDealer: 'Become a Dealer',
      dealerLogin: 'Dealer Portal',
      addProperty: '+ Post Property',
      customerDashboard: 'My Account',
      dealerDashboard: 'Dealer Dashboard',
      adminDashboard: 'Admin Control Center',
      login: 'Sign In',
      register: 'Register',
      logout: 'Log Out',
      switchLang: 'தமிழ்',
      saved: 'Saved',
    },
    notice: {
      title: 'Important Notice',
      content: `This platform provides a service to connect Property Owners/Dealers and Customers. Property verification, document verification and agreements must be independently verified and completed by the respective parties.\n\nNo mandatory commission is charged through this platform. Any applicable property listing fee will be clearly displayed separately.`,
      agreeCheckbox: 'I have read and agree to the above terms & conditions.',
      acceptBtn: 'Accept & Continue',
    },
    hero: {
      badge: '🌟 Tamil Nadu\'s Trusted Real Estate Network',
      title: 'Find the Right Property for Your Future',
      subtitle: 'Search lands, houses and rental properties across Tamil Nadu with verified listings and official platform coordination.',
      searchPlaceholder: 'Search by locality, project name, or keyword...',
      propertyType: 'Property Type',
      allTypes: 'All Categories',
      selectDistrict: 'Select District',
      allDistricts: 'All Tamil Nadu Districts',
      priceRange: 'Price Range',
      anyPrice: 'Any Budget',
      searchBtn: 'Search Properties',
      verifiedListingsCount: '1,500+ Verified Properties',
      districtsCovered: '38 TN Districts Covered',
      assistedDeals: '100% Platform Assisted Visits',
    },
    categories: {
      title: 'Explore Properties by Category',
      subtitle: 'Browse through our three curated categories tailored for Tamil Nadu property seekers.',
      landSaleTitle: 'Land for Sale',
      landSaleDesc: 'Find residential plots, CMDA/DTCP layouts, farm lands, and commercial sites.',
      houseSaleTitle: 'House for Sale',
      houseSaleDesc: 'Discover independent villas, modern apartments, individual houses, and gated communities.',
      houseRentTitle: 'House for Rent',
      houseRentDesc: 'Find rental homes, family apartments, and independent houses in your preferred location.',
      exploreCategory: 'Explore Listings',
      viewAllListings: 'Browse All Tamil Nadu Listings',
    },
    location: {
      title: 'Properties Across Tamil Nadu',
      subtitle: 'Choose your desired district to view verified lands, homes, and rental properties.',
      nearYou: 'Properties Near You',
      exploreByDistrict: 'Explore by District',
      allDistricts: 'All Districts',
      selectCity: 'Select City / Taluk',
      selectArea: 'Select Locality',
    },
    filters: {
      filterTitle: 'Filter Properties',
      clearAll: 'Reset Filters',
      apply: 'Apply Filters',
      resultsFound: 'Properties Found',
      propertyType: 'Property Category',
      saleOrRent: 'Purpose',
      district: 'District',
      cityArea: 'Area / Locality',
      budget: 'Budget (₹)',
      areaSqft: 'Area (Sq. Ft)',
      bedrooms: 'Bedrooms (BHK)',
      furnishing: 'Furnishing Status',
      parking: 'Parking Required',
      verifiedOnly: 'SPP Verified Listings Only',
      dtcpApproved: 'DTCP / RERA Approved Only',
      sortBy: 'Sort By',
      sortNewest: 'Newest Listed',
      sortPriceLowHigh: 'Price: Low to High',
      sortPriceHighLow: 'Price: High to Low',
      sortSqftHighLow: 'Area: Largest First',
      viewGrid: 'Grid View',
      viewList: 'List View',
    },
    property: {
      propertyId: 'Listing ID',
      sale: 'For Sale',
      rent: 'For Rent',
      land: 'Plot / Land',
      house: 'Residential House',
      perMonth: '/ month',
      sqft: 'Sq. Ft',
      bhk: 'BHK',
      baths: 'Baths',
      postedOn: 'Listed',
      verified: 'Verified by SPP',
      featured: 'Featured',
      viewDetails: 'View Full Details',
      callNow: 'Call SPP Nestora',
      whatsapp: 'WhatsApp SPP Nestora',
      scheduleVisit: 'Schedule Site Visit',
      overview: 'Property Overview',
      description: 'Property Description',
      specifications: 'Property Specifications',
      amenities: 'Features & Amenities',
      locationDetails: 'Location Details',
      videoTour: 'Property Video Tour',
      videoNotice: 'For Enquiry & Site Visits, Contact SPP Nestora Official Team',
      officialContactOnly: 'Official SPP Nestora Enquiry Desk',
      contactOfficialDesc: 'For safety, privacy, and transparent deal coordination, all property enquiries and site visits are handled directly by the SPP Nestora admin team.',
      facing: 'Facing',
      parkingAvailable: 'Parking',
      furnishingStatus: 'Furnishing',
      deposit: 'Advance / Deposit',
      maintenance: 'Maintenance',
      reportListing: 'Report this Property',
      shareListing: 'Share Listing',
      saveToFavorites: 'Save Property',
      similarProperties: 'Similar Properties You May Like',
      noPropertiesFound: 'No matching properties found',
      noPropertiesDesc: 'Try adjusting your filters or search keywords to find what you are looking for.',
      soldOut: 'Sold Out',
      rentedOut: 'Rented Out',
    },
    auth: {
      welcomeBack: 'Welcome Back',
      loginSubtitle: 'Sign in to access your SPP Nestora account and manage your properties or saved visits.',
      createAccount: 'Create an Account',
      registerSubtitle: 'Join SPP Nestora to explore verified properties or list your real-estate assets across Tamil Nadu.',
      iAmA: 'I am registering as a:',
      customer: 'Customer / Buyer / Tenant',
      dealer: 'Property Dealer / Owner / Builder',
      fullName: 'Full Name',
      email: 'Email Address',
      phone: 'Mobile Number (+91)',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      businessName: 'Business / Agency Name',
      district: 'Primary District',
      city: 'City / Taluk',
      address: 'Office / Residential Address',
      dealerType: 'Dealer Type',
      loginBtn: 'Sign In',
      registerBtn: 'Create My Account',
      forgotPassword: 'Forgot Password?',
      alreadyHaveAccount: 'Already have an account? Sign In',
      dontHaveAccount: 'Don\'t have an account? Register',
      dealerPendingNotice: 'Dealer Account Under Review',
      dealerPendingDesc: 'Thank you for registering. Your dealer account is being verified by the SPP Nestora admin team. Once approved, you can post property listings.',
      demoAdminCredentials: 'Admin Demo Login: admin@sppnestora.com / admin123',
      demoDealerCredentials: 'Dealer Demo Login: dealer@sppnestora.com / dealer123',
      demoCustomerCredentials: 'Customer Demo Login: customer@sppnestora.com / customer123',
    },
    addProperty: {
      title: 'Post New Property Listing',
      step1: 'Category',
      step2: 'Property Details',
      step3: 'Location',
      step4: 'Photos & Video',
      step5: 'Preview',
      step6: 'Listing Fee',
      selectType: 'Select Property Type',
      propertyTitle: 'Property Title (English)',
      propertyTitleTa: 'Property Title (Tamil - Optional)',
      description: 'Detailed Description',
      price: 'Price / Expected Rent (₹)',
      areaSqft: 'Total Area (Sq. Ft)',
      bedrooms: 'Number of Bedrooms',
      bathrooms: 'Number of Bathrooms',
      furnishing: 'Furnishing Status',
      facing: 'Direction Facing',
      district: 'District',
      city: 'City / Town',
      taluk: 'Taluk',
      area: 'Area / Locality',
      address: 'Street Address',
      pincode: 'PIN Code',
      uploadImages: 'Upload Property Photos (Up to 8)',
      uploadVideo: 'Property Video (Upload file or YouTube/Drive link)',
      reviewTitle: 'Review Property Details Before Submission',
      listingFeeTitle: 'Property Listing Fee — ₹10',
      listingFeeDesc: 'Every dealer property listing requires a nominal listing fee of ₹10. This is NOT a commission. Your property will be reviewed by admin and published immediately upon approval.',
      payAndSubmit: 'Pay ₹10 & Submit Listing',
      prevStep: 'Previous Step',
      nextStep: 'Continue to Next Step',
      listingFeeAmount: 'Listing Fee: ₹10 (One-time)',
      paymentNote: 'Instant online payment via UPI, Cards, NetBanking. Official receipt generated automatically.',
    },
    dashboard: {
      overview: 'Overview',
      properties: 'Properties',
      myListings: 'My Listings',
      enquiries: 'Customer Enquiries',
      siteVisits: 'Site Visits',
      payments: 'Payment Invoices',
      settings: 'Settings & Contact Config',
      dealers: 'Dealer Approvals',
      users: 'User Management',
      revenue: 'Listing Fee Revenue',
      totalProperties: 'Total Properties',
      activeListings: 'Active Listings',
      soldProperties: 'Sold Properties',
      rentedProperties: 'Rented Properties',
      pendingApproval: 'Pending Review',
      totalListingFees: 'Listing Fees Paid',
      totalEnquiries: 'Total Enquiries',
      markAsSold: 'Mark as Sold',
      markAsRented: 'Mark as Rented',
      hideListing: 'Hide from Public',
      unhideListing: 'Make Available',
      editListing: 'Edit Details',
      deleteListing: 'Archive / Delete',
      approve: 'Approve Listing',
      reject: 'Reject Listing',
      rejectReason: 'Rejection Reason',
      officialSettings: 'Platform Contact Settings',
      saveChanges: 'Save Changes',
    },
    enquiryModal: {
      title: 'Schedule a Site Visit / Official Enquiry',
      subtitle: 'Connect with SPP Nestora Admin team for guided inspection and document verification support.',
      yourName: 'Your Full Name',
      yourPhone: 'Mobile Phone Number',
      preferredDate: 'Preferred Visit Date',
      preferredTime: 'Preferred Time Slot',
      message: 'Specific Requirements or Questions',
      submitEnquiry: 'Submit Enquiry to SPP Nestora',
      enquirySuccess: 'Enquiry Received Successfully!',
      enquirySuccessDesc: 'Our SPP Nestora property executive will contact you shortly to coordinate your site visit.',
    },
    footer: {
      aboutText: 'SPP Nestora is Tamil Nadu\'s dedicated real-estate marketplace facilitating transparent property discovery for land, houses, and rentals with centralized platform coordination.',
      quickLinks: 'Quick Links',
      forDealers: 'For Property Dealers',
      support: 'Help & Compliance',
      languages: 'Language / மொழி',
      rights: 'All rights reserved.',
      disclaimerTitle: 'Legal Notice & Verification Disclaimer:',
      disclaimerBody: 'SPP Nestora acts as a discovery and communication bridge between property owners/dealers and buyers/tenants. All legal checks, document verifications, title confirmations, and agreements must be independently verified by the respective parties.',
      emergencyCall: 'Direct Platform Desk:',
    }
  },
  ta: {
    brand: {
      name: 'SPP நெஸ்டோரா',
      tagline: 'உங்கள் இடத்தை கண்டறியுங்கள். உங்கள் எதிர்காலத்தை உருவாக்குங்கள்.',
      subTagline: 'நிலம் | வீடுகள் | வாடகை | சொத்துக்கள்',
      officialCoordination: 'அனைத்து விசாரணைகளும் SPP நெஸ்டோரா நிர்வாக குழுவால் நேரடியாக ஒருங்கிணைக்கப்படுகின்றன.',
      disclaimer: 'சொத்து சரிபார்ப்பு, ஆவணங்கள் சரிபார்ப்பு மற்றும் ஒப்பந்தங்கள் சம்பந்தப்பட்ட தரப்பினரின் பொறுப்பாகும்.',
    },
    nav: {
      home: 'முகப்பு',
      landSale: 'விற்பனைக்கு உள்ள நிலங்கள்',
      houseSale: 'விற்பனைக்கு உள்ள வீடுகள்',
      houseRent: 'வாடகை வீடுகள்',
      allProperties: 'அனைத்து சொத்துக்கள்',
      about: 'எங்களை பற்றி',
      contact: 'தொடர்புக்கு',
      becomeDealer: 'டீலராக இணையுங்கள்',
      dealerLogin: 'டீலர் தளம்',
      addProperty: '+ புதிய சொத்து பதிவேற்றுக',
      customerDashboard: 'என் கணக்கு',
      dealerDashboard: 'டீலர் டாஷ்போர்டு',
      adminDashboard: 'நிர்வாக மையம்',
      login: 'உள்நுழைக',
      register: 'பதிவு செய்க',
      logout: 'வெளியேறுக',
      switchLang: 'English',
      saved: 'விருப்பங்கள்',
    },
    notice: {
      title: 'முக்கிய அறிவிப்பு',
      content: `இந்த தளத்தின் மூலம் Property Owner/Dealer மற்றும் Customer இடையே தொடர்பு ஏற்படுத்துவதற்கான சேவை வழங்கப்படுகிறது. Property verification, documents verification மற்றும் agreement போன்றவை சம்பந்தப்பட்ட தரப்பினரின் பொறுப்பாகும்.\n\nஇந்த தளத்தில் கட்டாய commission வசூலிக்கப்படாது. Dealer property listing செய்வதற்கு பொருந்தும் listing fee தனியாக காட்டப்படும்.`,
      agreeCheckbox: 'மேலே உள்ள விதிமுறைகளை நான் படித்து முழுமையாக ஒப்புக்கொள்கிறேன்.',
      acceptBtn: 'ஏற்றுக்கொண்டு தொடரவும்',
    },
    hero: {
      badge: '🌟 தமிழ்நாட்டின் நம்பகமான ரியல் எஸ்டேட் தளம்',
      title: 'உங்கள் எதிர்காலத்திற்கான சரியான சொத்தை கண்டறியுங்கள்',
      subtitle: 'தமிழ்நாடு முழுவதும் விற்பனைக்கு உள்ள நிலங்கள், வீடுகள் மற்றும் வாடகை வீடுகளை நம்பகமான தள ஒருங்கிணைப்புடன் தேடுங்கள்.',
      searchPlaceholder: 'பகுதி, ஊர் அல்லது முக்கிய சொற்கள் மூலம் தேடுங்கள்...',
      propertyType: 'சொத்து வகை',
      allTypes: 'அனைத்து பிரிவுகள்',
      selectDistrict: 'மாவட்டம் தேர்வு செய்க',
      allDistricts: 'அனைத்து தமிழ்நாடு மாவட்டங்கள்',
      priceRange: 'விலை வரம்பு',
      anyPrice: 'எந்த விலையும்',
      searchBtn: 'சொத்துக்களை தேடுக',
      verifiedListingsCount: '1,500+ சரிபார்க்கப்பட்ட சொத்துக்கள்',
      districtsCovered: '38 மாவட்டங்கள் உள்ளடக்கியது',
      assistedDeals: '100% நேரடி தள உதவி',
    },
    categories: {
      title: 'பிரிவு வாரியாக சொத்துக்களை ஆராயுங்கள்',
      subtitle: 'தமிழ்நாட்டு வாடிக்கையாளர்களுக்காக உருவாக்கப்பட்ட 3 முக்கிய பிரிவுகள்.',
      landSaleTitle: 'விற்பனைக்கு உள்ள நிலங்கள்',
      landSaleDesc: 'குடியிருப்பு மனைகள், DTCP/CMDA அங்கீகரிக்கப்பட்ட லேஅவுட்கள் மற்றும் விவசாய நிலங்கள்.',
      houseSaleTitle: 'விற்பனைக்கு உள்ள வீடுகள்',
      houseSaleDesc: 'தனி வீடுகள், நவீன அடுக்குமாடி குடியிருப்புகள் மற்றும் வில்லாக்கள்.',
      houseRentTitle: 'வாடகை வீடுகள்',
      houseRentDesc: 'உங்கள் விருப்பமான பகுதியில் குடும்பங்களுக்கான வாடகை வீடுகள் மற்றும் குடியிருப்புகள்.',
      exploreCategory: 'சொத்துக்களை பார்க்க',
      viewAllListings: 'அனைத்து தமிழ்நாட்டு சொத்துக்களையும் காண்க',
    },
    location: {
      title: 'தமிழ்நாடு முழுவதும் உள்ள சொத்துக்கள்',
      subtitle: 'உங்கள் மாவட்டத்தை தேர்வு செய்து விற்பனை மற்றும் வாடகை சொத்துக்களை பாருங்கள்.',
      nearYou: 'உங்கள் பகுதியில் உள்ள சொத்துக்கள்',
      exploreByDistrict: 'மாவட்டம் வாரியாக காண்க',
      allDistricts: 'அனைத்து மாவட்டங்கள்',
      selectCity: 'நகரம் / தாலுகா தேர்வு செய்க',
      selectArea: 'பகுதி தேர்வு செய்க',
    },
    filters: {
      filterTitle: 'சொத்து வடிகட்டி',
      clearAll: 'அனைத்தையும் நீக்குக',
      apply: 'வடிகட்டியை பயன்படுத்துக',
      resultsFound: 'கிடைத்த சொத்துக்கள்',
      propertyType: 'சொத்து பிரிவு',
      saleOrRent: 'நோக்கம்',
      district: 'மாவட்டம்',
      cityArea: 'பகுதி / ஊர்',
      budget: 'விலை வரம்பு (₹)',
      areaSqft: 'பரப்பளவு (சதுர அடி)',
      bedrooms: 'படுக்கையறைகள் (BHK)',
      furnishing: 'உபகரண நிலை',
      parking: 'பார்க்கிங் வசதி',
      verifiedOnly: 'SPP சரிபார்க்கப்பட்டவை மட்டும்',
      dtcpApproved: 'DTCP / RERA அங்கீகரிக்கப்பட்டவை மட்டும்',
      sortBy: 'வரிசைப்படுத்துக',
      sortNewest: 'புதியவை முதலில்',
      sortPriceLowHigh: 'விலை: குறைந்தது முதல் அதிகம்',
      sortPriceHighLow: 'விலை: அதிகம் முதல் குறைந்தது',
      sortSqftHighLow: 'பரப்பளவு: பெரியது முதலில்',
      viewGrid: 'கட்டம் பார்வை',
      viewList: 'பட்டியல் பார்வை',
    },
    property: {
      propertyId: 'சொத்து எண்',
      sale: 'விற்பனைக்கு',
      rent: 'வாடகைக்கு',
      land: 'மனை / நிலம்',
      house: 'குடியிருப்பு வீடு',
      perMonth: '/ மாதம்',
      sqft: 'சதுர அடி',
      bhk: 'BHK',
      baths: 'குளியலறைகள்',
      postedOn: 'பதிவேற்றப்பட்டது',
      verified: 'SPP சரிபார்க்கப்பட்டது',
      featured: 'சிறப்பு சொத்து',
      viewDetails: 'முழு விவரங்களை காண்க',
      callNow: 'SPP நெஸ்டோராவை அழைக்கவும்',
      whatsapp: 'SPP நெஸ்டோரா வாட்ஸ்அப்',
      scheduleVisit: 'தள பார்வை பதிவு செய்க',
      overview: 'சொத்து கண்ணோட்டம்',
      description: 'சொத்து விளக்கம்',
      specifications: 'முக்கிய விவரங்கள்',
      amenities: 'வசதிகள் மற்றும் அம்சங்கள்',
      locationDetails: 'இட விவரங்கள்',
      videoTour: 'சொத்து வீடியோ பார்வை',
      videoNotice: 'விசாரணை மற்றும் நேரடி பார்வைக்கு SPP நெஸ்டோரா குழுவை தொடர்பு கொள்ளவும்',
      officialContactOnly: 'அதிகாரப்பூர்வ SPP நெஸ்டோரா உதவி மையம்',
      contactOfficialDesc: 'பாதுகாப்பு, தனிநபர் ரகசியத்தன்மை மற்றும் வெளிப்படைத்தன்மைக்காக அனைத்து விசாரணைகளும் SPP நெஸ்டோரா நிர்வாக குழுவால் நேரடியாக கையாளப்படுகின்றன.',
      facing: 'திசை நோக்கு',
      parkingAvailable: 'வாகன நிறுத்துமிடம்',
      furnishingStatus: 'உபகரணங்கள்',
      deposit: 'முன்பணம் / அட்வான்ஸ்',
      maintenance: 'பராமரிப்பு கட்டணம்',
      reportListing: 'புகார் தெரிவிக்க',
      shareListing: 'பகிர்க',
      saveToFavorites: 'விருப்பத்தில் சேர்க்க',
      similarProperties: 'இதே போன்ற பிற சொத்துக்கள்',
      noPropertiesFound: 'பொருத்தமான சொத்துக்கள் கிடைக்கவில்லை',
      noPropertiesDesc: 'உங்கள் வடிகட்டிகளை மாற்றி அமைத்து மீண்டும் தேட முயற்சிக்கவும்.',
      soldOut: 'விற்பனை முடிந்தது',
      rentedOut: 'வாடகைக்கு விடப்பட்டது',
    },
    auth: {
      welcomeBack: 'மீண்டும் வருக',
      loginSubtitle: 'உங்கள் SPP நெஸ்டோரா கணக்கில் உள்நுழைந்து சொத்துக்களை நிர்வகிக்கவும்.',
      createAccount: 'புதிய கணக்கு தொடங்குக',
      registerSubtitle: 'தமிழ்நாடு முழுவதும் சொத்துக்களை தேட அல்லது உங்கள் சொத்தை பட்டியலிட இணையுங்கள்.',
      iAmA: 'நான் பதிவு செய்வது:',
      customer: 'வாடிக்கையாளர் / வாங்குபவர் / வாடகைதாரர்',
      dealer: 'சொத்து டீலர் / உரிமையாளர் / பில்டர்',
      fullName: 'முழு பெயர்',
      email: 'மின்னஞ்சல் முகவரி',
      phone: 'மொபைல் எண் (+91)',
      password: 'கடவுச்சொல்',
      confirmPassword: 'கடவுச்சொல்லை உறுதி செய்க',
      businessName: 'நிறுவன பெயர் / முகமை பெயர்',
      district: 'முதன்மை மாவட்டம்',
      city: 'நகரம் / தாலுகா',
      address: 'அலுவலக / குடியிருப்பு முகவரி',
      dealerType: 'டீலர் வகை',
      loginBtn: 'உள்நுழைக',
      registerBtn: 'கணக்கை உருவாக்குக',
      forgotPassword: 'கடவுச்சொல் மறந்துவிட்டதா?',
      alreadyHaveAccount: 'ஏற்கனவே கணக்கு உள்ளதா? உள்நுழைக',
      dontHaveAccount: 'புதிய பயனரா? பதிவு செய்க',
      dealerPendingNotice: 'டீலர் கணக்கு சரிபார்ப்பில் உள்ளது',
      dealerPendingDesc: 'பதிவு செய்தமைக்கு நன்றி. உங்கள் டீலர் கணக்கு SPP நெஸ்டோரா நிர்வாக குழுவால் சரிபார்க்கப்படுகிறது. ஒப்புதலுக்கு பின் சொத்துக்களை பதிவேற்றலாம்.',
      demoAdminCredentials: 'நிர்வாக மாதிரி உள்நுழைவு: admin@sppnestora.com / admin123',
      demoDealerCredentials: 'டீலர் மாதிரி உள்நுழைவு: dealer@sppnestora.com / dealer123',
      demoCustomerCredentials: 'வாடிக்கையாளர் மாதிரி உள்நுழைவு: customer@sppnestora.com / customer123',
    },
    addProperty: {
      title: 'புதிய சொத்து பட்டியலிடுதல்',
      step1: 'பிரிவு',
      step2: 'சொத்து விவரங்கள்',
      step3: 'இடம்',
      step4: 'படங்கள் & வீடியோ',
      step5: 'முன்னோட்டம்',
      step6: 'பதிவு கட்டணம்',
      selectType: 'சொத்து வகையை தேர்வு செய்க',
      propertyTitle: 'சொத்து தலைப்பு (ஆங்கிலம்)',
      propertyTitleTa: 'சொத்து தலைப்பு (தமிழ் - விருப்பத்திற்குரியது)',
      description: 'முழு விளக்கம்',
      price: 'விலை / எதிர்பார்க்கும் வாடகை (₹)',
      areaSqft: 'மொத்த பரப்பளவு (சதுர அடி)',
      bedrooms: 'படுக்கையறைகள் எண்ணிக்கை',
      bathrooms: 'குளியலறைகள் எண்ணிக்கை',
      furnishing: 'உபகரண நிலை',
      facing: 'திசை நோக்கு',
      district: 'மாவட்டம்',
      city: 'நகரம் / ஊர்',
      taluk: 'தாலுகா',
      area: 'பகுதி / ஏரியா',
      address: 'தெரு முகவரி',
      pincode: 'அஞ்சல் குறியீடு',
      uploadImages: 'சொத்து புகைப்படங்கள் (8 வரை)',
      uploadVideo: 'சொத்து வீடியோ (கோப்பு அல்லது யூடியூப்/டிரைவ் இணைப்பு)',
      reviewTitle: 'சமர்ப்பிக்கும் முன் சொத்து விவரங்களை சரிபார்க்கவும்',
      listingFeeTitle: 'சொத்து பதிவு கட்டணம் — ₹10',
      listingFeeDesc: 'ஒவ்வொரு டீலர் சொத்து பதிவிற்கும் ₹10 சிறிய பதிவு கட்டணம் பொருந்தும். இது கமிஷன் அல்ல. நிர்வாகியின் ஒப்புதலுக்குப் பிறகு உங்கள் சொத்து வெளியிடப்படும்.',
      payAndSubmit: '₹10 செலுத்தி சொத்தை சமர்ப்பிக்கவும்',
      prevStep: 'முந்தைய படி',
      nextStep: 'அடுத்த படிக்கு செல்க',
      listingFeeAmount: 'பதிவு கட்டணம்: ₹10 (ஒரு முறை)',
      paymentNote: 'UPI, கார்டு, நெட்பேங்கிங் மூலம் உடனடி கட்டணம். அதிகாரப்பூர்வ ரசீது உடனே உருவாக்கப்படும்.',
    },
    dashboard: {
      overview: 'கண்ணோட்டம்',
      properties: 'சொத்துக்கள்',
      myListings: 'என் சொத்துக்கள்',
      enquiries: 'வாடிக்கையாளர் விசாரணைகள்',
      siteVisits: 'தள பார்வைகள்',
      payments: 'கட்டண ரசீதுகள்',
      settings: 'தொடர்பு அமைப்புகள்',
      dealers: 'டீலர் ஒப்புதல்கள்',
      users: 'பயனர்கள் மேலாண்மை',
      revenue: 'பதிவு கட்டண வருவாய்',
      totalProperties: 'மொத்த சொத்துக்கள்',
      activeListings: 'செயலில் உள்ளவை',
      soldProperties: 'விற்பனையானவை',
      rentedProperties: 'வாடகைக்கு போனவை',
      pendingApproval: 'ஒப்புதலுக்கு காத்திருப்பவை',
      totalListingFees: 'செலுத்திய கட்டணங்கள்',
      totalEnquiries: 'மொத்த விசாரணைகள்',
      markAsSold: 'விற்பனையானதாக குறிக்க',
      markAsRented: 'வாடகைக்கு போனதாக குறிக்க',
      hideListing: 'மறைக்க',
      unhideListing: 'வெளியிட',
      editListing: 'விவரங்களை மாற்ற',
      deleteListing: 'நீக்குக / காப்பகப்படுத்துக',
      approve: 'ஒப்புதல் அளிக்க',
      reject: 'நிராகரிக்க',
      rejectReason: 'நிராகரிப்பு காரணம்',
      officialSettings: 'தள தொடர்பு அமைப்புகள்',
      saveChanges: 'மாற்றங்களை சேமிக்க',
    },
    enquiryModal: {
      title: 'நேரடி பார்வை / அதிகாரப்பூர்வ விசாரணை',
      subtitle: 'நேரடி சொத்து பார்வை மற்றும் ஆவண சரிபார்ப்பு உதவிக்கு SPP நெஸ்டோரா நிர்வாக குழுவுடன் இணையுங்கள்.',
      yourName: 'உங்கள் முழு பெயர்',
      yourPhone: 'மொபைல் எண்',
      preferredDate: 'பார்வையிட விரும்பும் தேதி',
      preferredTime: 'விரும்பும் நேரம்',
      message: 'உங்கள் தேவைகள் அல்லது கேள்விகள்',
      submitEnquiry: 'SPP நெஸ்டோராவிற்கு சமர்ப்பிக்கவும்',
      enquirySuccess: 'விசாரணை வெற்றிகரமாக பெறப்பட்டது!',
      enquirySuccessDesc: 'எங்கள் SPP நெஸ்டோரா சொத்து அலுவலர் உங்களை விரைவில் தொடர்பு கொண்டு பார்வை நேரத்தை உறுதி செய்வார்.',
    },
    footer: {
      aboutText: 'SPP நெஸ்டோரா என்பது தமிழ்நாட்டின் பிரத்யேக ரியல் எஸ்டேட் தளம். நிலம், வீடுகள் மற்றும் வாடகை சொத்துக்களுக்கான பாதுகாப்பான தளமாகும்.',
      quickLinks: 'முக்கிய இணைப்புகள்',
      forDealers: 'சொத்து டீலர்களுக்கு',
      support: 'உதவி & விதிமுறைகள்',
      languages: 'மொழி / Language',
      rights: 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
      disclaimerTitle: 'சட்ட அறிவிப்பு & சரிபார்ப்பு மறுப்புரை:',
      disclaimerBody: 'SPP நெஸ்டோரா என்பது சொத்து உரிமையாளர்கள்/டீலர்கள் மற்றும் வாங்குபவர்கள்/வாடகைதாரர்களுக்கு இடையே தொடர்பு பாலமாக செயல்படுகிறது. சொத்து சரிபார்ப்பு, ஆவணங்கள் சரிபார்ப்பு மற்றும் ஒப்பந்தங்கள் சம்பந்தப்பட்ட தரப்பினரின் பொறுப்பாகும்.',
      emergencyCall: 'நேரடி உதவி எண்:',
    }
  }
};
