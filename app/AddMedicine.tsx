import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text, Link } from './components/customizableFontElements';

const AddMedicine = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/AddMed.png')} style={styles.logo} />
        <Text style={styles.headerText}>Add new Medicine</Text>
      </View>
      <View style={styles.formContainer}>
        <TouchableOpacity 
          style={styles.scanButton} 
         >
          <View>
            <Link href={"/ScanMedicineScreen"} style={styles.scanText}>Scan via Camera</Link>
          </View>
        </TouchableOpacity>
    
        <TouchableOpacity style={styles.addButton}>
          <View>
            <Link href={"/ManuallyAdd"} style={styles.addButtonText}>Add Manually</Link>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};
//Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5e0e5',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    height:'30%',
    backgroundColor: '#f8c6d2',
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 70,
    borderTopLeftRadius: 70
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 10,
    right:120
  },
  headerText: {
    fontWeight: 'bold',
    color: '#4d004d',
    right:60
  },
  formContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EBEBEB',
    marginTop: -3,
    padding: 22,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  label: {
    fontWeight: 'bold',
    color: '#4d004d',
    marginBottom: 5,
  },
  scanButton: {
    backgroundColor: '#f8c6d2',
    padding: 22,
    top: '18%',
    width: '100%',
    marginBottom: 4,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 35,
    
  },
  scanText: {
    fontWeight: 'bold',
    color: '#4d004d',
    left: 50,
  },
  addButton: {
    backgroundColor: '#f8c6d2',
    padding: 22,
    top: '18%',
    width: '100%',
    marginTop: 15,
    marginBottom: 4,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 35,
  },
  addButtonText: {
    fontWeight: 'bold',
    color: '#4d004d',
    left: 70,
  },
});

export default AddMedicine;