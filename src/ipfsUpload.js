import { create } from 'ipfs-http-client';

// ✅ Connect to IPFS node (Infura or local)
const ipfs = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });

export async function uploadToIPFS(file) {
    try {
        const added = await ipfs.add(file);
        const fileUrl = `https://ipfs.io/ipfs/${added.path}`;
        console.log("✅ File uploaded successfully:", fileUrl);
        return fileUrl; // Returns the IPFS URL
    } catch (error) {
        console.error("❌ Error uploading to IPFS:", error);
    }
}
