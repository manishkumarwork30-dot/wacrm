const inputText = `HTL Network 
Omprakash Vishwakarma S/O Ramnarayan Vishwakarma 
City- W.No-04,Bajrang Mohalla,Surajpur Nake ke Pass,Behrasia Road
Post Office -Tehsil- Narsingh Garh 
 District- Rajgarh 
Pincode- 465669 
State- Madhya Pradesh 
M.no- 9993192017
Applier Name- Omprakash Vishwakarma 

RJ`;

const formatText = (inputText) => {
  const lines = inputText.split("\n").map(l => l.trim()).filter(Boolean);
  
  let applicantName = '';
  let fatherName = '';
  let cityVillage = '';
  let tehsil = '';
  let district = '';
  let pincode = '';
  let state = '';
  let mobile = '';
  let applierName = '';
  let tag = '';

  // Identify tag (if the last line is a short code, e.g. 2-4 characters)
  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1];
    if (lastLine.length <= 4 && !lastLine.includes('-') && !lastLine.includes(':')) {
      tag = lastLine.toUpperCase();
      lines.pop(); // Remove it from lines to process
    }
  }

  for (let line of lines) {
    // Check for S/O line
    if (line.toUpperCase().includes(' S/O ') || line.toUpperCase().includes(' S/O')) {
      const parts = line.split(/\s+s\/o\s*/i);
      if (parts.length >= 2) {
        applicantName = parts[0].trim();
        fatherName = parts[1].trim();
      } else {
        applicantName = line.trim();
      }
      continue;
    }

    const lowerLine = line.toLowerCase();

    // Check for fields
    if (lowerLine.startsWith('city-') || lowerLine.includes('city:') || lowerLine.startsWith('village-') || lowerLine.startsWith('vill-')) {
      cityVillage = line.replace(/^(city|village|vill)[-:\s]+/i, '').trim();
    } else if (lowerLine.includes('tehsil-') || lowerLine.includes('tehsil:')) {
      tehsil = line.split(/tehsil[-:\s]+/i)[1]?.trim() || '';
    } else if (lowerLine.includes('district-') || lowerLine.includes('district:') || lowerLine.includes('distt-') || lowerLine.includes('distt:') || lowerLine.startsWith('district ')) {
      district = line.replace(/^.*dist(rict|t)[-:\s]+/i, '').trim();
    } else if (lowerLine.startsWith('pincode-') || lowerLine.includes('pincode:')) {
      pincode = line.replace(/^pincode[-:\s]+/i, '').trim();
    } else if (lowerLine.startsWith('state-') || lowerLine.includes('state:')) {
      state = line.replace(/^state[-:\s]+/i, '').trim();
    } else if (lowerLine.startsWith('m.no-') || lowerLine.includes('m.no:') || lowerLine.startsWith('mobile-') || lowerLine.startsWith('mobile no-') || lowerLine.includes('mobile:')) {
      mobile = line.replace(/^(m\.no|mobile|mobile no)[-:\s]+/i, '').trim();
    } else if (lowerLine.startsWith('applier name-') || lowerLine.includes('applier name:') || lowerLine.startsWith('applicant name-')) {
      applierName = line.replace(/^(applier name|applicant name)[-:\s]+/i, '').trim();
    }
  }

  // Clean names helper
  const cleanName = (n) => {
    let cleaned = n.replace(/^(mr\.|mrs\.|ms\.)\s+/i, '').trim();
    return cleaned.toUpperCase();
  };

  const formattedApplicant = applicantName ? `MR. ${cleanName(applicantName)}` : '';
  const formattedFather = fatherName ? `MR. ${cleanName(fatherName)}` : '';
  const formattedApplier = applierName ? `MR. ${cleanName(applierName)}` : '';

  // Get state code
  const stateClean = state.toLowerCase();
  let stateCode = '';
  const stateCodes = {
    "madhya pradesh": "MP", "uttar pradesh": "UP", "rajasthan": "RJ", "bihar": "BR",
    "haryana": "HR", "punjab": "PB", "delhi": "DL", "gujarat": "GJ", "maharashtra": "MH",
    "west bengal": "WB", "tamil nadu": "TN", "karnataka": "KA", "andhra pradesh": "AP",
    "telangana": "TS", "chhattisgarh": "CG", "jharkhand": "JH", "odisha": "OD",
    "uttarakhand": "UK", "himachal pradesh": "HP", "jammu and kashmir": "JK"
  };
  if (stateClean) {
    stateCode = stateCodes[stateClean] || state.toUpperCase();
  }

  // Build the first line
  let firstLineParts = [];
  if (formattedApplicant) {
    if (formattedFather) {
      firstLineParts.push(`${formattedApplicant} S/O ${formattedFather}`);
    } else {
      firstLineParts.push(formattedApplicant);
    }
  }
  if (cityVillage) {
    firstLineParts.push(`VILL - ${cityVillage.toUpperCase()}`);
  }
  if (tehsil) {
    firstLineParts.push(`TEHSIL - ${tehsil.toUpperCase()}`);
  }
  if (district) {
    const stateSuffix = stateCode ? ` (${stateCode})` : '';
    const pinSuffix = pincode ? ` - ${pincode}` : '';
    firstLineParts.push(`DISTT - ${district.toUpperCase()}${stateSuffix}${pinSuffix}`);
  }

  const firstLine = firstLineParts.join(', ');
  const secondLine = `MOBILE NO - ${mobile}`;
  const thirdLine = `APPLIER NAME - ${formattedApplier}${tag ? ` (${tag})` : ''}`;

  return `${firstLine}\n${secondLine}\n${thirdLine}`;
};

console.log(formatText(inputText));
