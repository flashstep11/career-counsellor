import os
import sys
from pathlib import Path
import logging
import subprocess
import tempfile
from docx2pdf import convert

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def convert_docx_to_pdf(docx_path, pdf_path):
    """Convert .docx file to PDF using docx2pdf library"""
    try:
        convert(docx_path, pdf_path)
        return True
    except Exception as e:
        logger.error(f"Error converting {docx_path} with docx2pdf: {e}")
        return False


def convert_doc_to_pdf(doc_path, pdf_path):
    """Convert .doc file to PDF using LibreOffice on macOS"""
    try:
        # Check if LibreOffice is installed
        libreoffice_paths = [
            '/Applications/LibreOffice.app/Contents/MacOS/soffice',
            '/Applications/OpenOffice.app/Contents/MacOS/soffice'
        ]

        soffice_path = None
        for path in libreoffice_paths:
            if os.path.exists(path):
                soffice_path = path
                break

        if not soffice_path:
            logger.error(
                "LibreOffice or OpenOffice not found. Please install one of them.")
            return False

        # Create a temporary output directory
        with tempfile.TemporaryDirectory() as temp_dir:
            # Run LibreOffice to convert the document
            cmd = [
                soffice_path,
                '--headless',
                '--convert-to', 'pdf',
                '--outdir', temp_dir,
                doc_path
            ]

            subprocess.run(cmd, check=True, capture_output=True)

            # Get the output PDF name
            base_name = os.path.basename(doc_path)
            pdf_name = os.path.splitext(base_name)[0] + '.pdf'
            temp_pdf = os.path.join(temp_dir, pdf_name)

            # Check if conversion was successful
            if os.path.exists(temp_pdf):
                # Copy the PDF to the target location
                with open(temp_pdf, 'rb') as src, open(pdf_path, 'wb') as dst:
                    dst.write(src.read())
                return True

        return False
    except Exception as e:
        logger.error(f"Error converting {doc_path} with LibreOffice: {e}")
        return False


def process_directory(directory):
    """Recursively process all Word documents in a directory"""
    count = {'success': 0, 'failed': 0, 'skipped': 0}

    for root, _, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            file_lower = file.lower()

            # Process .docx files
            if file_lower.endswith('.docx'):
                pdf_path = os.path.splitext(file_path)[0] + '.pdf'

                # Skip if PDF already exists
                if os.path.exists(pdf_path):
                    logger.info(f"Skipping {file_path} (PDF already exists)")
                    count['skipped'] += 1
                    continue

                logger.info(f"Converting {file_path} to PDF")
                if convert_docx_to_pdf(file_path, pdf_path):
                    count['success'] += 1
                else:
                    count['failed'] += 1

            # Process .doc files
            elif file_lower.endswith('.doc'):
                pdf_path = os.path.splitext(file_path)[0] + '.pdf'

                # Skip if PDF already exists
                if os.path.exists(pdf_path):
                    logger.info(f"Skipping {file_path} (PDF already exists)")
                    count['skipped'] += 1
                    continue

                logger.info(f"Converting {file_path} to PDF")
                if convert_doc_to_pdf(file_path, pdf_path):
                    count['success'] += 1
                else:
                    count['failed'] += 1

    return count


def check_alternative_method():
    """Check if we can use textutil (macOS built-in tool)"""
    try:
        subprocess.run(['textutil', '--help'], check=True, capture_output=True)
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def main():
    if len(sys.argv) > 1:
        directory = sys.argv[1]
    else:
        directory = os.getcwd()

    directory = os.path.abspath(directory)
    logger.info(f"Starting conversion process in: {directory}")

    # Check if directory exists
    if not os.path.isdir(directory):
        logger.error(f"Directory does not exist: {directory}")
        sys.exit(1)

    # Process the directory
    counts = process_directory(directory)

    # Display results
    logger.info(f"Conversion complete!")
    logger.info(f"Successfully converted: {counts['success']} files")
    logger.info(f"Failed to convert: {counts['failed']} files")
    logger.info(f"Skipped (already existed): {counts['skipped']} files")


if __name__ == "__main__":
    # Check if we have any conversion method available
    has_textutil = check_alternative_method()

    if not has_textutil:
        logger.warning(
            "Note: For optimal .doc file conversion, please install LibreOffice or OpenOffice.")
        logger.warning(
            "docx2pdf will be used which works best with .docx files.")

    main()
